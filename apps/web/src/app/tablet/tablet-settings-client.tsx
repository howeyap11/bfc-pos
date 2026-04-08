"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/theme";
import {
  DEFAULT_TABLET_NAV,
  isTabletNavDirty,
  normalizeTabletNav,
  type TabletNavConfig,
} from "@/lib/tabletNav";
import { useTabletNav } from "./tablet-nav-context";

const UNLOCK_KEY = "bfc_tablet_settings_unlocked";

type SaveBanner = { kind: "success" | "error"; text: string } | null;

export default function TabletSettingsClient() {
  const { reloadNav } = useTabletNav();
  const [unlocked, setUnlocked] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(UNLOCK_KEY) === "1" : false
  );
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const verifiedPinRef = useRef("");

  const [navDraft, setNavDraft] = useState<TabletNavConfig>({ ...DEFAULT_TABLET_NAV });
  const baselineRef = useRef<TabletNavConfig | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<SaveBanner>(null);

  const unsaved = unlocked && !loading && isTabletNavDirty(navDraft, baselineRef.current);

  const loadPublicConfig = useCallback(async () => {
    setLoading(true);
    setSaveBanner(null);
    try {
      const res = await fetch("/api/store-config", { cache: "no-store" });
      const data = await res.json();
      /*
       * Intentional: tolerate missing/malformed tabletNav from API (e.g. column not migrated yet).
       */
      const n = normalizeTabletNav(data?.tabletNav);
      setNavDraft(n);
      baselineRef.current = { ...n };
    } catch {
      setNavDraft({ ...DEFAULT_TABLET_NAV });
      baselineRef.current = { ...DEFAULT_TABLET_NAV };
    } finally {
      setLoading(false);
    }
  }, []);

  /* Load section visibility only after unlock — controls stay hidden until PIN succeeds. */
  useEffect(() => {
    if (unlocked) void loadPublicConfig();
  }, [unlocked, loadPublicConfig]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setSaveBanner(null);
    try {
      const res = await fetch("/api/staff/verify-admin-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        verifiedPinRef.current = pinInput;
        sessionStorage.setItem(UNLOCK_KEY, "1");
        setUnlocked(true);
        setPinInput("");
      } else {
        setPinError(data.message || "Invalid admin PIN");
        setPinInput("");
      }
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : "Verification failed");
      setPinInput("");
    }
  }

  function handleLockSettings() {
    sessionStorage.removeItem(UNLOCK_KEY);
    verifiedPinRef.current = "";
    baselineRef.current = null;
    setUnlocked(false);
    setSaveBanner(null);
    setPinError("");
    setNavDraft({ ...DEFAULT_TABLET_NAV });
  }

  async function handleSaveNav() {
    const pin = verifiedPinRef.current.trim();
    if (!pin) {
      setSaveBanner({ kind: "error", text: "Unlock with admin PIN again, then save." });
      return;
    }
    setSaving(true);
    setSaveBanner(null);
    try {
      const res = await fetch("/api/store-config/tablet-nav", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminPin: pin, tabletNav: navDraft }),
      });
      const text = await res.text();
      let data: { ok?: boolean; tabletNav?: unknown; message?: string; error?: string } = {};
      try {
        data = JSON.parse(text || "{}") as typeof data;
      } catch {
        setSaveBanner({
          kind: "error",
          text: text?.trim() ? `Save failed: ${text.slice(0, 200)}` : "Save failed: invalid response from server.",
        });
        return;
      }
      if (!res.ok) {
        setSaveBanner({
          kind: "error",
          text: data.message || data.error || `Save failed (${res.status}).`,
        });
        return;
      }
      const saved = normalizeTabletNav(data.tabletNav ?? navDraft);
      setNavDraft(saved);
      baselineRef.current = { ...saved };
      setSaveBanner({
        kind: "success",
        text: "Saved. Menu visibility is updated on this POS and will apply after a refresh on other tablets.",
      });
      await reloadNav();
    } catch (e: unknown) {
      setSaveBanner({
        kind: "error",
        text: e instanceof Error ? e.message : "Save failed (network or server error).",
      });
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof TabletNavConfig) {
    setNavDraft((d) => ({ ...d, [key]: !d[key] }));
  }

  if (!unlocked) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Tablet settings</h2>
        <p style={{ color: COLORS.textSecondary, fontSize: 17, lineHeight: 1.5, marginBottom: 24 }}>
          Enter the admin PIN to change which sections appear in the tablet menu.
        </p>
        <form onSubmit={handlePinSubmit}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Admin PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{
              width: "100%",
              minHeight: 56,
              fontSize: 20,
              padding: "0 16px",
              borderRadius: 10,
              border: `2px solid ${COLORS.borderLight}`,
              background: COLORS.bgPanel,
              color: COLORS.textPrimary,
              marginBottom: 12,
            }}
          />
          {pinError && (
            <div
              role="alert"
              style={{
                color: "#fecaca",
                marginBottom: 12,
                fontSize: 16,
                padding: 12,
                background: "rgba(127,29,29,0.35)",
                borderRadius: 8,
                border: "1px solid #b91c1c",
              }}
            >
              {pinError}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              minHeight: 56,
              fontSize: 20,
              fontWeight: 800,
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, fontSize: 18, color: COLORS.textSecondary }}>Loading settings…</div>
    );
  }

  const row = (key: keyof TabletNavConfig, label: string, hint: string) => (
    <label
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "18px 16px",
        marginBottom: 12,
        background: COLORS.bgPanel,
        borderRadius: 12,
        border: `1px solid ${COLORS.borderLight}`,
        cursor: "pointer",
        minHeight: 64,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 4 }}>{hint}</div>
      </div>
      <input
        type="checkbox"
        checked={navDraft[key]}
        onChange={() => toggle(key)}
        style={{ width: 28, height: 28, cursor: "pointer" }}
      />
    </label>
  );

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Tablet settings</h2>
        <button
          type="button"
          onClick={handleLockSettings}
          style={{
            minHeight: 48,
            padding: "0 18px",
            fontSize: 16,
            fontWeight: 700,
            background: "transparent",
            color: COLORS.textSecondary,
            border: `2px solid ${COLORS.borderLight}`,
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Lock settings
        </button>
      </div>

      {unsaved && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(234,179,8,0.15)",
            border: "1px solid #ca8a04",
            color: "#fde047",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Unsaved changes — tap Save to apply, or Lock settings to discard and require PIN again.
        </div>
      )}

      <p style={{ color: COLORS.textSecondary, fontSize: 16, marginBottom: 20 }}>
        Settings stays in the menu even when all other sections are hidden. If every section is off, opening{" "}
        <strong style={{ color: COLORS.textPrimary }}>/tablet</strong> sends you here.
      </p>

      {row("showPending", "Pending orders", "Paid tickets and open orders waiting on prep.")}
      {row("showQr", "QR orders", "Incoming QR orders to accept or decline.")}
      {row("showKitchen", "Kitchen display", "KDS columns, sounds, and bump flow.")}
      {row("showStaff", "Staff", "Staff login for this device (same session as register).")}

      <p style={{ color: COLORS.textSecondary, fontSize: 15, lineHeight: 1.5, marginTop: 20, marginBottom: 8 }}>
        Kitchen display category filtering is configured in <strong style={{ color: COLORS.textPrimary }}>POS → Settings</strong>{" "}
        (admin PIN), not here.
      </p>

      {saveBanner && (
        <div
          role={saveBanner.kind === "error" ? "alert" : "status"}
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 10,
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.45,
            background: saveBanner.kind === "success" ? "rgba(34,197,94,0.2)" : "rgba(127,29,29,0.4)",
            border: `2px solid ${saveBanner.kind === "success" ? "#22c55e" : "#ef4444"}`,
            color: saveBanner.kind === "success" ? "#86efac" : "#fecaca",
          }}
        >
          {saveBanner.text}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSaveNav()}
        style={{
          width: "100%",
          minHeight: 56,
          marginTop: 24,
          fontSize: 20,
          fontWeight: 800,
          background: COLORS.primary,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.8 : 1,
        }}
      >
        {saving ? "Saving…" : "Save menu visibility"}
      </button>
    </div>
  );
}
