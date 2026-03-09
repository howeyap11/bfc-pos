"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

export default function PasswordPinsPage() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAdminPinConfigured().then((r) => { setConfigured(r.configured); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleSaveAdminPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const p = pin.replace(/\D/g, "");
    if (p.length !== 4) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    if (p[0] === "0") {
      setError("PIN cannot start with 0");
      return;
    }
    if (p !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    setSaving(true);
    try {
      await api.setAdminPin(p);
      setSuccess("Admin PIN saved. POS can verify via cloud when CLOUD_URL and STORE_SYNC_SECRET are configured.");
      setConfigured(true);
      setPin("");
      setConfirmPin("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = "w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40";
  const inputBg = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Password & PIN Codes</h1>
      <p className="mb-6 text-sm text-white/60">
        Admin PIN and staff PINs for POS. These sync to the POS for admin actions and cashier login.
      </p>

      {success && (
        <div className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">{success}</div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div
        className="mb-6 rounded-lg border p-6"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
      >
        <h2 className="mb-2 text-sm font-semibold text-white">Admin PIN</h2>
        <p className="mb-4 text-sm text-white/60">
          Used for admin-protected actions in POS (refunds, transactions view, etc.). 4 digits, cannot start with 0.
        </p>
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : (
          <form onSubmit={handleSaveAdminPin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-white/80">New Admin PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className={inputStyle}
                style={inputBg}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/80">Confirm Admin PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className={inputStyle}
                style={inputBg}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={saving || pin.length !== 4 || pin !== confirmPin}
              className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              {saving ? "Saving…" : configured ? "Update Admin PIN" : "Set Admin PIN"}
            </button>
          </form>
        )}
      </div>

      <div
        className="rounded-lg border p-6"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
      >
        <h2 className="mb-2 text-sm font-semibold text-white">Staff PINs</h2>
        <p className="mb-4 text-sm text-white/60">
          Cashier and staff members with their PINs for POS login.
        </p>
        <p className="text-sm text-white/50">
          Staff PIN management coming soon. Staff are currently managed in the POS.
        </p>
      </div>
    </div>
  );
}
