"use client";

import { useEffect, useState, useCallback } from "react";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";

const WEB_VERSION = process.env.NEXT_PUBLIC_POS_VERSION ?? "0.1.0";

type PaymentMethod = "CASH" | "CARD" | "GCASH" | "FOODPANDA" | "GRABFOOD" | "BFCAPP";

type StoreConfig = {
  storeId: string;
  enabledPaymentMethods: PaymentMethod[];
  splitPaymentEnabled: boolean;
  paymentMethodOrder: PaymentMethod[] | null;
  stickerPrintCategoryIds?: string[];
};

type DeviceStatus = {
  version: string;
  deviceConfigured: boolean;
  commandState: string;
  errorMessage?: string;
  lastUpdateAt?: string;
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; description: string }> = [
  { value: "CASH", label: "Cash", description: "Cash payments at register" },
  { value: "CARD", label: "Card", description: "Credit/Debit card payments" },
  { value: "GCASH", label: "GCash", description: "GCash mobile payments" },
  { value: "FOODPANDA", label: "Foodpanda", description: "Foodpanda delivery orders" },
  { value: "GRABFOOD", label: "GrabFood", description: "GrabFood delivery orders" },
  { value: "BFCAPP", label: "BFC App", description: "BFC mobile app orders" },
];

export default function SettingsClient() {
  const keyboard = useOnScreenKeyboard();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethod[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [stickerPrintCategoryIds, setStickerPrintCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [receiptPrinter, setReceiptPrinter] = useState("");
  const [stickerPrinter, setStickerPrinter] = useState("");
  const [stickerWidthMm, setStickerWidthMm] = useState(80);
  const [stickerHeightMm, setStickerHeightMm] = useState(60);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [printerSaving, setPrinterSaving] = useState(false);
  const [printerTestLoading, setPrinterTestLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

  const loadPrinters = useCallback(async () => {
    try {
      const staff = typeof window !== "undefined" ? localStorage.getItem("bfc_active_staff") : null;
      const staffKey = staff ? (JSON.parse(staff) as { staffKey?: string }).staffKey : null;
      const headers = staffKey ? { "x-staff-key": staffKey } : {};
      const [configRes, availableRes] = await Promise.all([
        fetch("/api/system/printers", { cache: "no-store", headers }),
        fetch("/api/system/printers/available", { cache: "no-store", headers }),
      ]);
      const configData = await configRes.json();
      const availableData = await availableRes.json();
      if (configRes.ok) {
        setReceiptPrinter(configData.receiptPrinter ?? "");
        setStickerPrinter(configData.stickerPrinter ?? "");
        setStickerWidthMm(Number(configData.stickerWidthMm) || 80);
        setStickerHeightMm(Number(configData.stickerHeightMm) || 60);
      }
      if (availableRes.ok && Array.isArray(availableData.printers)) {
        setAvailablePrinters(availableData.printers);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCategories(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadStatus();
      loadPrinters();
      loadCategories();
      const t = setInterval(loadStatus, 5000);
      return () => clearInterval(t);
    }
  }, [isAuthenticated, loadStatus, loadPrinters, loadCategories]);

  useEffect(() => {
    if (status?.commandState === "updating") setOverlay("updating");
    else if (status?.commandState === "restarting") setOverlay("restarting");
    else setOverlay(null);
  }, [status?.commandState]);

  async function loadConfig() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/store-config", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load config");
      }

      setConfig(data);
      setEnabledMethods(data.enabledPaymentMethods || []);
      setSplitEnabled(data.splitPaymentEnabled ?? true);
      setStickerPrintCategoryIds(Array.isArray(data.stickerPrintCategoryIds) ? data.stickerPrintCategoryIds : []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

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
    } catch (e: any) {
      setPinError("Verification failed: " + (e?.message || String(e)));
      setPinInput("");
    }
  }

  async function getStaffHeaders(): Promise<Record<string, string>> {
    const staff = typeof window !== "undefined" ? localStorage.getItem("bfc_active_staff") : null;
    const staffKey = staff ? (JSON.parse(staff) as { staffKey?: string }).staffKey : null;
    return staffKey ? { "x-staff-key": staffKey } : {};
  }

  async function handleSavePrinters() {
    setError(null);
    setPrinterSaving(true);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/system/printers", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({
          receiptPrinter: receiptPrinter.trim(),
          stickerPrinter: stickerPrinter.trim(),
          stickerWidthMm: Math.max(1, Math.round(Number(stickerWidthMm) || 80)),
          stickerHeightMm: Math.max(1, Math.round(Number(stickerHeightMm) || 60)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setPrinterSaving(false);
    }
  }

  async function handleTestPrinter(type: "receipt" | "sticker") {
    setError(null);
    setPrinterTestLoading(type);
    try {
      const headers = await getStaffHeaders();
      const path = type === "receipt" ? "/api/system/printers/test-receipt" : "/api/system/printers/test-sticker";
      const res = await fetch(path, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Test print failed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Test print failed");
    } finally {
      setPrinterTestLoading(null);
    }
  }

  async function handleAction(
    action: "poll" | "update" | "restart" | "sync",
    path: string,
    method = "POST"
  ) {
    setError(null);
    setSuccess(null);
    setActionLoading(action);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch(path, {
        method,
        headers: { "content-type": "application/json", ...headers },
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

  /** Force catalog sync – no admin PIN required (staff session only). Used above PIN gate for emergency menu updates. */
  async function handleForceCatalogSync() {
    setError(null);
    setSuccess(null);
    setActionLoading("sync");
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/device/commands/sync-catalog", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed");
      setSuccess("Catalog sync started.");
      setTimeout(() => setSuccess(null), 3000);
      await loadStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleForceFullResync() {
    if (
      !window.confirm(
        "This will reset the catalog sync version so the next sync re-downloads all menu data (full resync). Use this to recover missing drink sizes or catalog data. Continue?"
      )
    )
      return;
    setError(null);
    setSuccess(null);
    setActionLoading("resync");
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/device/commands/reset-catalog-sync", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || data.error || "Full resync failed";
        setError(msg);
        return;
      }
      setSuccess(data.message ?? "Catalog reset and full sync completed.");
      setTimeout(() => setSuccess(null), 5000);
      await loadStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Full resync failed");
    } finally {
      setActionLoading(null);
    }
  }

  const busy = status?.commandState === "updating" || status?.commandState === "restarting" || status?.commandState === "syncing";

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const headers = await getStaffHeaders();
      const res = await fetch("/api/store-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          enabledPaymentMethods: enabledMethods,
          splitPaymentEnabled: splitEnabled,
          paymentMethodOrder: null,
          stickerPrintCategoryIds: stickerPrintCategoryIds.length > 0 ? stickerPrintCategoryIds : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save config");
      }

      setConfig(data);
      setStickerPrintCategoryIds(Array.isArray(data.stickerPrintCategoryIds) ? data.stickerPrintCategoryIds : []);
      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleMethod(method: PaymentMethod) {
    if (enabledMethods.includes(method)) {
      if (enabledMethods.length > 1) {
        setEnabledMethods(enabledMethods.filter((m) => m !== method));
      }
    } else {
      setEnabledMethods([...enabledMethods, method]);
    }
  }

  function toggleStickerCategory(categoryId: string) {
    if (stickerPrintCategoryIds.includes(categoryId)) {
      setStickerPrintCategoryIds(stickerPrintCategoryIds.filter((id) => id !== categoryId));
    } else {
      setStickerPrintCategoryIds([...stickerPrintCategoryIds, categoryId]);
    }
  }

  // PIN Gate - same pattern as Transactions
  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: 24,
          background: COLORS.bgDarkest,
          gap: 24,
        }}
      >
        {/* Force catalog sync – outside PIN gate for emergency menu updates */}
        <div
          style={{
            background: COLORS.bgDark,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${COLORS.borderLight}`,
            minWidth: 350,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
            Catalog sync
          </h2>
          <p style={{ margin: "0 0 16px 0", color: COLORS.textSecondary, fontSize: 14 }}>
            Pull latest menu from cloud without entering admin PIN.
          </p>
          {(error || success) && (
            <div style={{ marginBottom: 12, fontSize: 14, color: error ? COLORS.error : COLORS.success }}>
              {error || success}
            </div>
          )}
          <button
            type="button"
            onClick={handleForceCatalogSync}
            disabled={!!actionLoading}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 15,
              fontWeight: "600",
              background: actionLoading ? COLORS.bgDark : COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: actionLoading ? "not-allowed" : "pointer",
            }}
          >
            {actionLoading === "sync" ? "Syncing…" : "Force catalog sync"}
          </button>
        </div>

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
            Admin Access Required
          </h2>
          <p style={{ margin: "0 0 20px 0", color: COLORS.textSecondary, fontSize: 14 }}>
            Enter Admin PIN to access settings.
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

  // Main Settings UI - dark styling to match other POS tabs; scrollable within layout
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        padding: 24,
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        background: COLORS.bgDarkest,
      }}
    >
      <div
        style={{
          background: COLORS.bgDark,
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: COLORS.textPrimary }}>
            Settings
          </h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              background: COLORS.error,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Lock
          </button>
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

        <div
          style={{
            background: COLORS.bgPanel,
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 600, color: COLORS.textPrimary }}>
            Payment Modes
          </h2>
          <p style={{ color: COLORS.textSecondary, marginBottom: 24, fontSize: 14 }}>
            Configure which payment methods are available at the POS register.
          </p>

          {loading ? (
            <p style={{ color: COLORS.textSecondary }}>Loading configuration...</p>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: COLORS.textSecondary }}>
                  Enabled Payment Methods
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 12,
                  }}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: 12,
                        background: enabledMethods.includes(method.value)
                          ? COLORS.primaryLight
                          : COLORS.bgDark,
                        border: `2px solid ${
                          enabledMethods.includes(method.value) ? COLORS.primary : COLORS.borderLight
                        }`,
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabledMethods.includes(method.value)}
                        onChange={() => toggleMethod(method.value)}
                        style={{ width: 20, height: 20, marginRight: 12, cursor: "pointer" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: "600",
                            marginBottom: 2,
                            color: COLORS.textPrimary,
                          }}
                        >
                          {method.label}
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                          {method.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24, paddingTop: 24, borderTop: `1px solid ${COLORS.borderLight}` }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: COLORS.textSecondary }}>
                  Split Payment
                </h3>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 12,
                    background: splitEnabled ? COLORS.primaryLight : COLORS.bgDark,
                    border: `2px solid ${splitEnabled ? COLORS.primary : COLORS.borderLight}`,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={splitEnabled}
                    onChange={(e) => setSplitEnabled(e.target.checked)}
                    style={{ width: 20, height: 20, marginRight: 12, cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", marginBottom: 2, color: COLORS.textPrimary }}>
                      Enable Split Payment
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                      Allow customers to pay using multiple payment methods
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: 24, paddingTop: 24, borderTop: `1px solid ${COLORS.borderLight}` }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: COLORS.textSecondary }}>
                  Sticker print categories
                </h3>
                <p style={{ color: COLORS.textSecondary, marginBottom: 12, fontSize: 14 }}>
                  Items in selected categories (or with size/temp) will print a sticker. Select none to disable sticker printing.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: stickerPrintCategoryIds.includes(cat.id) ? COLORS.primaryLight : COLORS.bgDark,
                        border: `2px solid ${stickerPrintCategoryIds.includes(cat.id) ? COLORS.primary : COLORS.borderLight}`,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={stickerPrintCategoryIds.includes(cat.id)}
                        onChange={() => toggleStickerCategory(cat.id)}
                        style={{ width: 18, height: 18, marginRight: 8, cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: "500", color: COLORS.textPrimary }}>{cat.name}</span>
                    </label>
                  ))}
                </div>
                {categories.length === 0 && !loading && (
                  <p style={{ fontSize: 13, color: COLORS.textSecondary }}>No categories (sync menu first).</p>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 16,
                    fontWeight: "600",
                    background: saving ? COLORS.bgDark : COLORS.success,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={loadConfig}
                  disabled={loading || saving}
                  style={{
                    padding: 16,
                    fontSize: 16,
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    cursor: loading || saving ? "not-allowed" : "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>

        {/* Status */}
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
          {status ? (
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
                  {status.lastUpdateAt ? new Date(status.lastUpdateAt).toLocaleString() : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p style={{ color: COLORS.textSecondary }}>Loading…</p>
          )}
        </div>

        {/* Printers */}
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
            Printers
          </h2>
          <p style={{ color: COLORS.textSecondary, marginBottom: 16, fontSize: 14 }}>
            Select the Windows printers for receipts and drink stickers (USB printers connected to this PC).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: COLORS.textSecondary }}>
                Receipt Printer
              </label>
              <select
                value={receiptPrinter}
                onChange={(e) => setReceiptPrinter(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  fontSize: 14,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 6,
                  background: COLORS.bgDark,
                  color: COLORS.textPrimary,
                }}
              >
                <option value="">— Select printer —</option>
                {availablePrinters.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: COLORS.textSecondary }}>
                Sticker Printer
              </label>
              <select
                value={stickerPrinter}
                onChange={(e) => setStickerPrinter(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  fontSize: 14,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 6,
                  background: COLORS.bgDark,
                  color: COLORS.textPrimary,
                }}
              >
                <option value="">— Select printer —</option>
                {availablePrinters.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: COLORS.textSecondary }}>
                  Sticker width (mm)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={stickerWidthMm}
                  onChange={(e) => setStickerWidthMm(Number(e.target.value) || 80)}
                  style={{
                    width: "100%",
                    padding: 10,
                    fontSize: 14,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: COLORS.textSecondary }}>
                  Sticker height (mm)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={stickerHeightMm}
                  onChange={(e) => setStickerHeightMm(Number(e.target.value) || 60)}
                  style={{
                    width: "100%",
                    padding: 10,
                    fontSize: 14,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                onClick={handleSavePrinters}
                disabled={printerSaving}
                style={btnStyle(printerSaving)}
              >
                {printerSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => handleTestPrinter("receipt")}
                disabled={!!printerTestLoading || printerSaving}
                style={btnStyle(printerTestLoading === "receipt")}
              >
                {printerTestLoading === "receipt" ? "Printing…" : "Test Receipt Printer"}
              </button>
              <button
                onClick={() => handleTestPrinter("sticker")}
                disabled={!!printerTestLoading || printerSaving}
                style={btnStyle(printerTestLoading === "sticker")}
              >
                {printerTestLoading === "sticker" ? "Printing…" : "Test Sticker Printer"}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            background: COLORS.bgPanel,
            borderRadius: 8,
            padding: 20,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
            System actions
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
              onClick={handleForceFullResync}
              disabled={busy || !!actionLoading}
              style={btnStyle(!!actionLoading && actionLoading !== "resync")}
            >
              {actionLoading === "resync" ? "Resyncing…" : "Force full catalog resync"}
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
              style={{ ...btnStyle(!!actionLoading && actionLoading !== "restart"), background: COLORS.error }}
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
