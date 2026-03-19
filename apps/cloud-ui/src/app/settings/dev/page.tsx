"use client";

import { useState, useEffect } from "react";
import { getDevMode, setDevMode, canUseDangerousDevTools } from "@/lib/devMode";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const CONFIRM_PHRASE = "CLEAR TEST DATA";
const DELETE_TEST_PHRASE = "DELETE TEST TRANSACTIONS";

export default function DevSettingsPage() {
  const [devMode, setDevModeState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTestModalOpen, setDeleteTestModalOpen] = useState(false);
  const [deleteTestPassword, setDeleteTestPassword] = useState("");
  const [deleteTestPhrase, setDeleteTestPhrase] = useState("");
  const [deleteTestLoading, setDeleteTestLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDevModeState(getDevMode());
  }, []);

  const handleToggle = () => {
    const next = !devMode;
    setDevMode(next);
    setDevModeState(next);
  };

  const canUseDangerous = canUseDangerousDevTools();
  const isProduction = process.env.NODE_ENV === "production";

  async function handleClearAdminCache() {
    setError("");
    if (password.trim() === "") {
      setError("Enter your admin password.");
      return;
    }
    if (confirmPhrase.trim().toUpperCase() !== CONFIRM_PHRASE) {
      setError(`Type exactly: ${CONFIRM_PHRASE}`);
      return;
    }
    setLoading(true);
    try {
      await api.clearAdminCache(password);
      setSuccess("Admin cache clear logged. Local dashboard cache cleared — reload the dashboard to refresh data.");
      setModalOpen(false);
      setPassword("");
      setConfirmPhrase("");
      if (typeof window !== "undefined") {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("bfc_dashboard") || k.startsWith("bfc_admin_cache"))) keysToRemove.push(k);
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {}
      }
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTestTransactions() {
    setError("");
    if (deleteTestPassword.trim() === "") {
      setError("Enter your admin password.");
      return;
    }
    if (deleteTestPhrase.trim().toUpperCase() !== DELETE_TEST_PHRASE) {
      setError(`Type exactly: ${DELETE_TEST_PHRASE}`);
      return;
    }
    setDeleteTestLoading(true);
    try {
      const res = await api.deleteTestTransactions(deleteTestPassword);
      setSuccess(`Deleted ${res.deletedCount} test transaction(s). Production transactions were not affected.`);
      setDeleteTestModalOpen(false);
      setDeleteTestPassword("");
      setDeleteTestPhrase("");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    } finally {
      setDeleteTestLoading(false);
    }
  }

  const inputStyle = "w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40";
  const inputBg = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Dev</h1>
      <p className="mb-6 text-sm text-white/60">
        Dev Mode enables extra tools for development and testing. Default OFF.
      </p>

      <div
        className="mb-4 rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200"
        role="alert"
      >
        Dev tools do not remove official live sales records.
      </div>

      {success && (
        <div className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div
        className="mb-6 rounded-lg border p-6"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
      >
        <h2 className="mb-2 text-sm font-semibold text-white">Dev Mode</h2>
        <p className="mb-4 text-sm text-white/60">
          When ON, Settings → Devices Used shows &quot;Reset Device Cache&quot; and this page shows the admin cache tool.
          Persisted on this device only.
        </p>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={devMode}
            onChange={handleToggle}
            className="h-4 w-4 rounded border-gray-500"
          />
          <span className="text-sm text-white">Dev Mode</span>
        </label>
      </div>

      {devMode && (
        <div
          className="rounded-lg border p-6"
          style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
        >
          <h2 className="mb-2 text-sm font-semibold text-white">Dangerous tool (admin only)</h2>
          {!canUseDangerous && (
            <p className="mb-4 text-sm text-amber-400">
              Dangerous dev tools are disabled in production. They are only available when not in production.
            </p>
          )}
          <p className="mb-4 text-sm text-white/60">
            <strong>Clear Admin Cached Transaction Data</strong> — Clears dashboard caches and local admin transaction
            snapshots only. It does NOT delete any canonical server transaction or order records.
          </p>
          <button
            type="button"
            onClick={() => { setModalOpen(true); setError(""); setConfirmPhrase(""); setPassword(""); }}
            className="rounded border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            Clear Admin Cached Transaction Data
          </button>

          <div className="mt-6 border-t pt-6" style={{ borderColor: COLORS.borderLight }}>
            <h2 className="mb-2 text-sm font-semibold text-white">Test Transactions</h2>
            <p className="mb-4 text-sm text-white/60">
              Delete all transactions marked as test (isTest = true). Only affects records created while Dev Mode was ON
              on the POS. Production transactions are never deleted.
            </p>
            <button
              type="button"
              onClick={() => { setDeleteTestModalOpen(true); setError(""); setDeleteTestPhrase(""); setDeleteTestPassword(""); }}
              disabled={!canUseDangerous}
              className="rounded border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete All Test Transactions
            </button>
          </div>
        </div>
      )}

      {deleteTestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !deleteTestLoading && setDeleteTestModalOpen(false)}
        >
          <div
            className="max-w-md rounded-lg border p-6 shadow-xl"
            style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-white">Delete All Test Transactions</h3>
            <p className="mb-4 text-sm text-amber-200">
              This will delete ALL transactions marked as test (isTest = true). Production transactions will NOT be
              affected.
            </p>
            <p className="mb-4 text-sm text-white/70">
              Only records created while Dev Mode was ON on the POS will be removed.
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-white/80">Admin password</label>
              <input
                type="password"
                value={deleteTestPassword}
                onChange={(e) => setDeleteTestPassword(e.target.value)}
                placeholder="Your admin password"
                className={inputStyle}
                style={inputBg}
                autoComplete="current-password"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-white/80">Type to confirm: {DELETE_TEST_PHRASE}</label>
              <input
                type="text"
                value={deleteTestPhrase}
                onChange={(e) => setDeleteTestPhrase(e.target.value)}
                placeholder={DELETE_TEST_PHRASE}
                className={inputStyle}
                style={inputBg}
                autoComplete="off"
              />
            </div>
            {!canUseDangerous && (
              <p className="mb-4 text-sm text-amber-400">This action is disabled in production.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteTestTransactions}
                disabled={!canUseDangerous || deleteTestLoading || deleteTestPassword.trim() === "" || deleteTestPhrase.trim().toUpperCase() !== DELETE_TEST_PHRASE}
                className="rounded border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteTestLoading ? "…" : "Delete test transactions"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTestModalOpen(false)}
                disabled={deleteTestLoading}
                className="rounded border px-4 py-2 text-sm text-white/70"
                style={{ borderColor: COLORS.borderLight }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !loading && setModalOpen(false)}
        >
          <div
            className="max-w-md rounded-lg border p-6 shadow-xl"
            style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-white">Confirm: Clear Admin Cached Transaction Data</h3>
            <p className="mb-2 text-sm text-white/80">This will clear:</p>
            <ul className="mb-2 list-inside list-disc text-sm text-white/70">
              <li>Dashboard caches</li>
              <li>Local admin transaction snapshots</li>
              <li>Derived analytics cache (local)</li>
            </ul>
            <p className="mb-4 text-sm text-white/80">This will NOT clear:</p>
            <ul className="mb-4 list-inside list-disc text-sm text-white/70">
              <li>Canonical server transaction or order records</li>
              <li>Live fiscal/BIR-relevant sales history</li>
            </ul>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-white/80">Admin password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your admin password"
                className={inputStyle}
                style={inputBg}
                autoComplete="current-password"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-white/80">Type to confirm: {CONFIRM_PHRASE}</label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className={inputStyle}
                style={inputBg}
                autoComplete="off"
              />
            </div>
            {!canUseDangerous && (
              <p className="mb-4 text-sm text-amber-400">
                This action is disabled in production. Only cache clearing in non-production environments is allowed.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearAdminCache}
                disabled={!canUseDangerous || loading || password.trim() === "" || confirmPhrase.trim().toUpperCase() !== CONFIRM_PHRASE}
                className="rounded border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "…" : "Clear cache"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={loading}
                className="rounded border px-4 py-2 text-sm text-white/70"
                style={{ borderColor: COLORS.borderLight }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
