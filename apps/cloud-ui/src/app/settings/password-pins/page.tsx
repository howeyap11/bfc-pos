"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { getCloudAdminRoleFromToken } from "@/lib/cloudAdminRole";

export default function PasswordPinsPage() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [ownerConfigured, setOwnerConfigured] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerConfirm, setOwnerConfirm] = useState("");
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerSuccess, setOwnerSuccess] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: string; email: string; role: "ADMIN" | "MANAGER"; createdAt: string; updatedAt: string }>>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const isAdmin = getCloudAdminRoleFromToken() === "ADMIN";

  useEffect(() => {
    api.getAdminPinConfigured().then((r) => { setConfigured(r.configured); setLoading(false); }).catch(() => setLoading(false));
    api.getOwnerPasswordConfigured().then((r) => { setOwnerConfigured(r.configured); setOwnerLoading(false); }).catch(() => setOwnerLoading(false));
    if (isAdmin) {
      api.getAdminAccounts()
        .then((r) => setAccounts(r.accounts ?? []))
        .finally(() => setAccountsLoading(false));
    } else {
      setAccountsLoading(false);
    }
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
        className="mb-6 rounded-lg border p-6"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
      >
        <h2 className="mb-2 text-sm font-semibold text-white">Owner Password</h2>
        <p className="mb-4 text-sm text-white/60">
          For hidden owner/developer tools in POS (sync status, dev mode, backfill, etc.). Min 6 characters. Syncs to POS automatically.
        </p>
        {ownerLoading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setOwnerError("");
              setOwnerSuccess("");
              if (ownerPassword.length < 6) {
                setOwnerError("Password must be at least 6 characters");
                return;
              }
              if (ownerPassword !== ownerConfirm) {
                setOwnerError("Passwords do not match");
                return;
              }
              setOwnerSaving(true);
              try {
                await api.setOwnerPassword(ownerPassword);
                setOwnerSuccess("Owner password saved. POS terminals will sync within 5–10 minutes.");
                setOwnerConfigured(true);
                setOwnerPassword("");
                setOwnerConfirm("");
                setTimeout(() => setOwnerSuccess(""), 5000);
              } catch (err: unknown) {
                const body = (err as { body?: { message?: string } })?.body;
                setOwnerError(body?.message ?? (err instanceof Error ? err.message : "Failed to save"));
              } finally {
                setOwnerSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm text-white/80">Owner Password</label>
              <input
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="••••••"
                className={inputStyle}
                style={inputBg}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/80">Confirm Owner Password</label>
              <input
                type="password"
                value={ownerConfirm}
                onChange={(e) => setOwnerConfirm(e.target.value)}
                placeholder="••••••"
                className={inputStyle}
                style={inputBg}
                autoComplete="new-password"
              />
            </div>
            {ownerError && (
              <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{ownerError}</div>
            )}
            {ownerSuccess && (
              <div className="rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">{ownerSuccess}</div>
            )}
            <button
              type="submit"
              disabled={ownerSaving || ownerPassword.length < 6 || ownerPassword !== ownerConfirm}
              className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              {ownerSaving ? "Saving…" : ownerConfigured ? "Update Owner Password" : "Set Owner Password"}
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
          Cashier and staff members with their PINs for POS login. Managed in Cloud Admin and synced to POS.
        </p>
        <Link
          href="/settings/staff"
          className="inline-block rounded px-3 py-1.5 text-sm font-medium text-black"
          style={{ background: COLORS.primary }}
        >
          Manage staff
        </Link>
      </div>

      {isAdmin && (
        <div
          className="mt-6 rounded-lg border p-6"
          style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
        >
          <h2 className="mb-2 text-sm font-semibold text-white">Cloud Admin Accounts</h2>
          <p className="mb-4 text-sm text-white/60">
            Create and remove Cloud Admin login accounts (ADMIN or MANAGER).
          </p>
          {accountError && (
            <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{accountError}</div>
          )}
          {accountSuccess && (
            <div className="mb-3 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">{accountSuccess}</div>
          )}
          <form
            className="mb-4 grid gap-2 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setAccountError("");
              setAccountSuccess("");
              setAccountBusy(true);
              try {
                await api.createAdminAccount({ email: accountEmail.trim(), password: accountPassword, role: accountRole });
                const refreshed = await api.getAdminAccounts();
                setAccounts(refreshed.accounts ?? []);
                setAccountSuccess("Account created.");
                setAccountEmail("");
                setAccountPassword("");
                setAccountRole("MANAGER");
              } catch (err: unknown) {
                const body = (err as { body?: { message?: string } })?.body;
                setAccountError(body?.message ?? (err instanceof Error ? err.message : "Failed to create account"));
              } finally {
                setAccountBusy(false);
              }
            }}
          >
            <input
              type="email"
              placeholder="email@example.com"
              className={inputStyle}
              style={inputBg}
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6)"
              className={inputStyle}
              style={inputBg}
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              minLength={6}
              required
            />
            <select
              className={inputStyle}
              style={inputBg}
              value={accountRole}
              onChange={(e) => setAccountRole(e.target.value as "ADMIN" | "MANAGER")}
            >
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              type="submit"
              disabled={accountBusy || !accountEmail || accountPassword.length < 6}
              className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              {accountBusy ? "Creating..." : "Create Account"}
            </button>
          </form>
          {accountsLoading ? (
            <p className="text-sm text-white/50">Loading accounts…</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
                  <div>
                    <div className="text-sm text-white">{acc.email}</div>
                    <div className="text-xs text-white/60">{acc.role}</div>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-red-500/50 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    onClick={async () => {
                      if (!confirm(`Delete account ${acc.email}?`)) return;
                      setAccountError("");
                      setAccountSuccess("");
                      try {
                        await api.deleteAdminAccount(acc.id);
                        const refreshed = await api.getAdminAccounts();
                        setAccounts(refreshed.accounts ?? []);
                        setAccountSuccess("Account deleted.");
                      } catch (err: unknown) {
                        const body = (err as { body?: { message?: string } })?.body;
                        setAccountError(body?.message ?? (err instanceof Error ? err.message : "Failed to delete account"));
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {accounts.length === 0 && <p className="text-sm text-white/50">No accounts found.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
