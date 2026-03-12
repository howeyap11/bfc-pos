"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";

const WEB_VERSION = process.env.NEXT_PUBLIC_POS_VERSION ?? "0.1.0";

type DeviceStatus = {
  version: string;
  deviceConfigured: boolean;
  commandState: string;
  errorMessage?: string;
  lastUpdateAt?: string;
};

export default function SystemClient() {
  const keyboard = useOnScreenKeyboard();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<"updating" | "restarting" | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/device/status", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStatus();
      const t = setInterval(loadStatus, 5000);
      return () => clearInterval(t);
    }
  }, [isAuthenticated, loadStatus]);

  useEffect(() => {
    if (status?.commandState === "updating") setOverlay("updating");
    else if (status?.commandState === "restarting") setOverlay("restarting");
    else setOverlay(null);
  }, [status?.commandState]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/staff/verify-admin-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAuthenticated(true);
        setPinError("");
        setPinInput("");
      } else {
        setPinError(data.message || "Invalid admin PIN");
        setPinInput("");
      }
    } catch (e: unknown) {
      setPinError("Verification failed");
      setPinInput("");
    }
  }

  async function handleAction(
    action: "poll" | "update" | "restart" | "sync",
    path: string,
    method = "POST"
  ) {
    setError(null);
    setActionLoading(action);
    try {
      const staff = typeof window !== "undefined" ? localStorage.getItem("bfc_active_staff") : null;
      const staffKey = staff ? (JSON.parse(staff) as { staffKey?: string }).staffKey : null;
      const res = await fetch(path, {
        method,
        headers: {
          "content-type": "application/json",
          ...(staffKey && { "x-staff-key": staffKey }),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed");
      if (action === "update" || action === "restart") {
        setOverlay(action === "update" ? "updating" : "restarting");
      }
      await loadStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  const busy = status?.commandState === "updating" || status?.commandState === "restarting" || status?.commandState === "syncing";

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: 24,
          background: COLORS.bgDarkest,
        }}
      >
        <div
          style={{
            background: COLORS.bgDark,
            padding: 32,
            borderRadius: 12,
            border: `1px solid ${COLORS.borderLight}`,
            minWidth: 350,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center", color: COLORS.textPrimary }}>
            System Access
          </h2>
          <p style={{ margin: "0 0 20px 0", color: COLORS.textSecondary, fontSize: 14 }}>
            Enter Admin PIN to access system controls.
          </p>
          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              inputMode="none"
              readOnly
              value={pinInput}
              onClick={() => {
                keyboard.openKeyboard({
                  mode: "pin",
                  value: pinInput,
                  title: "Admin PIN",
                  onChange: setPinInput,
                  onDone: (val) => {
                    setPinInput(val);
                    keyboard.closeKeyboard();
                  },
                });
              }}
              placeholder="Tap to enter PIN"
              style={{
                width: "100%",
                padding: 14,
                fontSize: 18,
                textAlign: "center",
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 6,
                marginBottom: 16,
                background: COLORS.bgPanel,
                color: COLORS.textPrimary,
                cursor: "pointer",
              }}
            />
            {pinError && (
              <div style={{ color: COLORS.error, marginBottom: 16, fontSize: 14, textAlign: "center" }}>
                {pinError}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 14,
                fontSize: 16,
                fontWeight: "600",
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Unlock
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link href="/pos/settings" style={{ color: COLORS.textSecondary, fontSize: 14 }}>
              ← Back to Settings
            </Link>
          </div>
        </div>
        {keyboard.isOpen && (
          <OnScreenKeyboard
            isOpen={keyboard.isOpen}
            mode={keyboard.mode}
            value={keyboard.value}
            title={keyboard.title}
            onClose={keyboard.closeKeyboard}
            onValueChange={keyboard.updateValue}
            onDone={keyboard.handleDone}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 600,
        margin: "0 auto",
        background: COLORS.bgDarkest,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          background: COLORS.bgDark,
          borderRadius: 8,
          padding: 24,
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: COLORS.textPrimary }}>System</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/pos/settings"
              style={{
                padding: "8px 16px",
                fontSize: 14,
                color: COLORS.textSecondary,
                textDecoration: "none",
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 6,
              }}
            >
              ← Settings
            </Link>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              background: "rgba(239,68,68,0.2)",
              border: `1px solid ${COLORS.error}`,
              borderRadius: 6,
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: COLORS.bgPanel,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
            Status
          </h2>
          {loading ? (
            <p style={{ color: COLORS.textSecondary }}>Loading…</p>
          ) : status ? (
            <dl style={{ margin: 0, color: COLORS.textPrimary, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <dt style={{ margin: 0, color: COLORS.textSecondary }}>POS frontend version</dt>
                <dd style={{ margin: 0 }}>{WEB_VERSION}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <dt style={{ margin: 0, color: COLORS.textSecondary }}>API version</dt>
                <dd style={{ margin: 0 }}>{status.version}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <dt style={{ margin: 0, color: COLORS.textSecondary }}>API health</dt>
                <dd style={{ margin: 0 }}>{status.commandState === "idle" || status.commandState === "syncing" ? "OK" : status.commandState}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt style={{ margin: 0, color: COLORS.textSecondary }}>Last update</dt>
                <dd style={{ margin: 0 }}>
                  {status.lastUpdateAt
                    ? new Date(status.lastUpdateAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p style={{ color: COLORS.textSecondary }}>Unable to load status</p>
          )}
        </div>

        <div
          style={{
            background: COLORS.bgPanel,
            borderRadius: 8,
            padding: 20,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
            Actions
          </h2>
          <p style={{ color: COLORS.textSecondary, marginBottom: 16, fontSize: 14 }}>
            These actions require admin role and staff session.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => handleAction("poll", "/api/device/poll-commands")}
              disabled={busy || !!actionLoading}
              style={btnStyle(!!actionLoading && actionLoading !== "poll")}
            >
              {actionLoading === "poll" ? "Checking…" : "Check for updates"}
            </button>
            <button
              onClick={() => handleAction("sync", "/api/device/commands/sync")}
              disabled={busy || !!actionLoading}
              style={btnStyle(!!actionLoading && actionLoading !== "sync")}
            >
              {actionLoading === "sync" ? "Syncing…" : "Force sync catalog"}
            </button>
            <button
              onClick={() => handleAction("update", "/api/device/commands/update")}
              disabled={busy || !!actionLoading}
              style={btnStyle(!!actionLoading && actionLoading !== "update")}
            >
              {actionLoading === "update" ? "Updating…" : "Apply update"}
            </button>
            <button
              onClick={() => handleAction("restart", "/api/device/commands/restart")}
              disabled={busy || !!actionLoading}
              style={{
                ...btnStyle(!!actionLoading && actionLoading !== "restart"),
                background: COLORS.error,
              }}
            >
              {actionLoading === "restart" ? "Restarting…" : "Restart POS"}
            </button>
          </div>
        </div>
      </div>

      {overlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: COLORS.bgDarkest,
            color: COLORS.textPrimary,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 9999,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            {overlay === "updating" ? "Updating POS…" : "Restarting POS…"}
          </div>
          <div style={{ fontSize: 14, color: COLORS.textSecondary }}>Please wait</div>
        </div>
      )}
    </div>
  );
}

function btnStyle(disabled: boolean) {
  return {
    padding: 14,
    fontSize: 15,
    fontWeight: "600",
    background: disabled ? COLORS.bgDark : COLORS.primary,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
  } as const;
}
