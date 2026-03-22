"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";
import {
  getSyncQueueItems,
  processSyncQueue,
  notifySyncQueueUpdated,
  addSyncQueueUpdatedListener,
} from "@/lib/syncQueue";

const OWNER_UNLOCK_KEY = "bfc_owner_unlocked";
const OWNER_UNLOCK_EXPIRY_KEY = "bfc_owner_unlock_expiry";
const INACTIVITY_LOCK_MS = 5 * 60 * 1000; // 5 minutes

function formatLastSync(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return d.toLocaleString();
}

function btnStyle(disabled: boolean) {
  return {
    padding: 14,
    fontSize: 15,
    fontWeight: "600" as const,
    background: disabled ? COLORS.bgDark : COLORS.primary,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export default function OwnerToolsClient({
  onLock,
  onClose,
}: {
  onLock: () => void;
  onClose?: () => void;
}) {
  const keyboard = useOnScreenKeyboard();
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [cloudSync, setCloudSync] = useState<{ pendingCount: number; highRetryCount: number }>({
    pendingCount: 0,
    highRetryCount: 0,
  });
  const [catalogSync, setCatalogSync] = useState<{
    status: string;
    lastSyncAt: number | null;
    lastError: string | null;
  }>({ status: "unknown", lastSyncAt: null, lastError: null });
  const [connectivity, setConnectivity] = useState<boolean | null>(null);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<{ devMode?: boolean } | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [devModeSaving, setDevModeSaving] = useState(false);
  const [deleteTestModalOpen, setDeleteTestModalOpen] = useState(false);
  const [deleteTestPin, setDeleteTestPin] = useState("");
  const [deleteTestLoading, setDeleteTestLoading] = useState(false);
  const [deleteTestError, setDeleteTestError] = useState<string | null>(null);
  const [deleteTestSuccess, setDeleteTestSuccess] = useState<string | null>(null);

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      onLock();
      inactivityTimerRef.current = null;
    }, INACTIVITY_LOCK_MS);
  }, [onLock]);

  useEffect(() => {
    touchActivity();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [touchActivity]);

  async function getStaffHeaders(): Promise<Record<string, string>> {
    const staff = typeof window !== "undefined" ? localStorage.getItem("bfc_active_staff") : null;
    const staffKey = staff ? (JSON.parse(staff) as { staffKey?: string }).staffKey : null;
    const out: Record<string, string> = {};
    if (staffKey) out["x-staff-key"] = staffKey;
    return out;
  }

  const loadSystemStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/system-status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCloudSync({
          pendingCount: data.cloudSync?.pendingCount ?? 0,
          highRetryCount: data.cloudSync?.highRetryCount ?? 0,
        });
        setCatalogSync({
          status: data.catalogSync?.status ?? "unknown",
          lastSyncAt: data.catalogSync?.lastSyncAt ?? null,
          lastError: data.catalogSync?.lastError ?? null,
        });
        setConnectivity(data.connectivity?.online ?? null);
      }
    } catch {
      setConnectivity(false);
    }
  }, []);

  const updateOfflineCount = useCallback(() => {
    setOfflineQueueCount(getSyncQueueItems().length);
  }, []);

  useEffect(() => {
    updateOfflineCount();
    const unsub = addSyncQueueUpdatedListener(updateOfflineCount);
    return unsub;
  }, [updateOfflineCount]);

  useEffect(() => {
    loadSystemStatus();
    const t = setInterval(loadSystemStatus, 10000);
    return () => clearInterval(t);
  }, [loadSystemStatus]);

  useEffect(() => {
    fetch("/api/store-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setDevMode(!!d?.devMode);
      })
      .catch(() => setConfig(null));
  }, []);

  async function handleRetrySync() {
    touchActivity();
    setSyncRetrying(true);
    setError(null);
    try {
      await processSyncQueue();
      notifySyncQueueUpdated();
      updateOfflineCount();
      await loadSystemStatus();
      setSuccess("Offline queue synced.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncRetrying(false);
    }
  }

  async function handleBackfill() {
    touchActivity();
    if (
      !confirm(
        "Enqueue PAID/VOID sales that are not yet queued for cloud sync? Uploads run in the background. Continue?"
      )
    )
      return;
    setActionLoading("txBackfill");
    setError(null);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/admin/sync/transactions/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Backfill failed");
      setSuccess(
        `Enqueued ${data.enqueued ?? 0} for cloud sync (${data.skippedAlreadyQueued ?? 0} already queued).`
      );
      setTimeout(() => setSuccess(null), 5000);
      await loadSystemStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleForceFullResync() {
    touchActivity();
    if (
      !confirm(
        "This will reset the catalog sync version so the next sync re-downloads all menu data (full resync). Continue?"
      )
    )
      return;
    setActionLoading("resync");
    setError(null);
    try {
      const res = await fetch("/api/device/commands/reset-catalog-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Resync failed");
      setSuccess("Catalog reset. Full sync will run shortly.");
      setTimeout(() => setSuccess(null), 4000);
      await loadSystemStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Full resync failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAction(action: string, url: string) {
    touchActivity();
    setActionLoading(action);
    setError(null);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Action failed");
      setSuccess(action === "restart" ? "Restarting…" : action === "update" ? "Updating…" : "Done.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDevModeToggle() {
    touchActivity();
    setDevModeSaving(true);
    setError(null);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/store-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ devMode: !devMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setDevMode(!!data.devMode);
      if (config) setConfig({ ...config, devMode: !!data.devMode });
      setSuccess(!!data.devMode ? "Dev mode ON" : "Dev mode OFF");
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update Dev Mode");
    } finally {
      setDevModeSaving(false);
    }
  }

  async function handleDeleteTestTransactions() {
    touchActivity();
    if (!confirm("Delete all transactions marked as test? Production transactions are not affected. Continue?"))
      return;
    setDeleteTestError(null);
    setDeleteTestSuccess(null);
    setDeleteTestLoading(true);
    try {
      const res = await fetch("/api/dev/delete-test-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: deleteTestPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteTestError(data?.message || data?.error || "Failed");
        return;
      }
      setDeleteTestSuccess(`Deleted ${data.deletedCount ?? 0} test transaction(s).`);
      setDeleteTestPin("");
      setTimeout(() => {
        setDeleteTestModalOpen(false);
        setDeleteTestSuccess(null);
      }, 2000);
    } catch (e) {
      setDeleteTestError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDeleteTestLoading(false);
    }
  }

  return (
    <div
      onClick={touchActivity}
      onKeyDown={touchActivity}
      style={{
        background: COLORS.bgPanel,
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
        border: `1px solid ${COLORS.borderLight}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: COLORS.textPrimary }}>Owner / Developer Tools</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onLock}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              background: COLORS.bgDark,
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Lock
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                background: COLORS.bgDark,
                color: COLORS.textSecondary,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#7f1d1d",
            border: `1px solid ${COLORS.error}`,
            borderRadius: 6,
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "rgba(34, 197, 94, 0.2)",
            border: `1px solid ${COLORS.success}`,
            borderRadius: 6,
            color: "#86efac",
          }}
        >
          {success}
        </div>
      )}

      {/* Sync status */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
          Sync & connectivity
        </h3>
        <dl style={{ margin: 0, fontSize: 14, color: COLORS.textPrimary }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <dt style={{ margin: 0, color: COLORS.textSecondary }}>Offline queue</dt>
            <dd style={{ margin: 0 }}>{offlineQueueCount} pending</dd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <dt style={{ margin: 0, color: COLORS.textSecondary }}>Cloud sync</dt>
            <dd style={{ margin: 0 }}>
              {cloudSync.pendingCount} pending
              {cloudSync.highRetryCount > 0 && (
                <span style={{ color: COLORS.error, marginLeft: 8 }}>({cloudSync.highRetryCount} high-retry)</span>
              )}
            </dd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <dt style={{ margin: 0, color: COLORS.textSecondary }}>Last catalog sync</dt>
            <dd style={{ margin: 0 }}>{formatLastSync(catalogSync.lastSyncAt)}</dd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <dt style={{ margin: 0, color: COLORS.textSecondary }}>Connectivity</dt>
            <dd style={{ margin: 0 }}>
              {connectivity === null ? "—" : connectivity ? (
                <span style={{ color: COLORS.success }}>Online</span>
              ) : (
                <span style={{ color: COLORS.error }}>Offline</span>
              )}
            </dd>
          </div>
        </dl>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleRetrySync}
            disabled={syncRetrying}
            style={btnStyle(syncRetrying)}
          >
            {syncRetrying ? "Syncing…" : "Retry sync"}
          </button>
          <button
            type="button"
            onClick={handleBackfill}
            disabled={!!actionLoading}
            style={btnStyle(!!actionLoading)}
          >
            {actionLoading === "txBackfill" ? "Queueing…" : "Backfill sync"}
          </button>
          <button
            type="button"
            onClick={handleForceFullResync}
            disabled={!!actionLoading}
            style={btnStyle(!!actionLoading)}
          >
            {actionLoading === "resync" ? "Resyncing…" : "Force full catalog resync"}
          </button>
        </div>
      </div>

      {/* Dev mode */}
      <div style={{ marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.borderLight}` }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Dev / Test</h3>
        <p style={{ margin: "0 0 12px 0", fontSize: 14, color: COLORS.textSecondary }}>
          When ON, all new transactions are marked as test. Delete them from Cloud Admin or below.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={devMode}
            onChange={handleDevModeToggle}
            disabled={devModeSaving}
            style={{ width: 20, height: 20, cursor: devModeSaving ? "not-allowed" : "pointer" }}
          />
          <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
            {devModeSaving ? "Saving…" : devMode ? "Dev Mode ON" : "Dev Mode OFF"}
          </span>
        </label>
        <button
          type="button"
          onClick={() => {
            setDeleteTestModalOpen(true);
            setDeleteTestPin("");
            setDeleteTestError(null);
            setDeleteTestSuccess(null);
          }}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 600,
            background: "rgba(239, 68, 68, 0.2)",
            color: "#fca5a5",
            border: "1px solid rgba(239, 68, 68, 0.5)",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Delete all test transactions
        </button>
      </div>

      {/* System actions */}
      <div style={{ paddingTop: 16, borderTop: `1px solid ${COLORS.borderLight}` }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
          System actions
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() => handleAction("poll", "/api/device/poll-commands")}
            disabled={!!actionLoading}
            style={btnStyle(!!actionLoading)}
          >
            {actionLoading === "poll" ? "Checking…" : "Check for updates"}
          </button>
          <button
            type="button"
            onClick={() => handleAction("update", "/api/device/commands/update")}
            disabled={!!actionLoading}
            style={btnStyle(!!actionLoading)}
          >
            {actionLoading === "update" ? "Updating…" : "Apply update"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Restart the POS application? Unsaved work may be lost.")) {
                handleAction("restart", "/api/device/commands/restart");
              }
            }}
            disabled={!!actionLoading}
            style={{ ...btnStyle(!!actionLoading), background: COLORS.error }}
          >
            {actionLoading === "restart" ? "Restarting…" : "Restart POS"}
          </button>
        </div>
      </div>

      {deleteTestModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            padding: 24,
          }}
          onClick={() => !deleteTestLoading && setDeleteTestModalOpen(false)}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: COLORS.bgPanel,
              borderRadius: 12,
              padding: 24,
              border: `1px solid ${COLORS.borderLight}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: COLORS.textPrimary }}>
              Delete all test transactions
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: 14, color: COLORS.textSecondary }}>
              This will delete all transactions marked as test in the cloud. Requires admin PIN.
            </p>
            {deleteTestError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: "#7f1d1d",
                  color: "#fecaca",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                {deleteTestError}
              </div>
            )}
            {deleteTestSuccess && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: "rgba(34,197,94,0.2)",
                  color: "#86efac",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                {deleteTestSuccess}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: COLORS.textSecondary }}>
                Admin PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={deleteTestPin}
                onChange={(e) => setDeleteTestPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Enter admin PIN"
                onClick={() => {
                  keyboard.openKeyboard({
                    mode: "pin",
                    value: deleteTestPin,
                    title: "Admin PIN",
                    onChange: setDeleteTestPin,
                    onDone: (val) => {
                      setDeleteTestPin(val);
                      keyboard.closeKeyboard();
                    },
                  });
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 16,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 6,
                  background: COLORS.bgDark,
                  color: COLORS.textPrimary,
                  cursor: "pointer",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                disabled={deleteTestLoading || !deleteTestPin.trim()}
                onClick={handleDeleteTestTransactions}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  background: deleteTestLoading || !deleteTestPin.trim() ? "#555" : "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: deleteTestLoading || !deleteTestPin.trim() ? "not-allowed" : "pointer",
                }}
              >
                {deleteTestLoading ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                disabled={deleteTestLoading}
                onClick={() => setDeleteTestModalOpen(false)}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  background: "transparent",
                  color: COLORS.textSecondary,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 6,
                  cursor: deleteTestLoading ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

export { OWNER_UNLOCK_KEY };
