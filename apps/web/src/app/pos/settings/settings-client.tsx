"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";
import OwnerToolsClient, { OWNER_UNLOCK_KEY } from "./owner-tools-client";

const WEB_VERSION = process.env.NEXT_PUBLIC_POS_VERSION ?? "0.1.0";
const SETTINGS_ADMIN_UNLOCK_KEY = "bfc_settings_admin_unlocked";
const VERSION_TAP_THRESHOLD = 7;

type PaymentMethod = "CASH" | "CARD" | "GCASH" | "FOODPANDA" | "GRABFOOD" | "BFCAPP";

type StoreConfig = {
  storeId: string;
  enabledPaymentMethods: PaymentMethod[];
  splitPaymentEnabled: boolean;
  paymentMethodOrder: PaymentMethod[] | null;
  stickerPrintCategoryIds?: string[];
  devMode?: boolean;
  snapResiboEnabled?: boolean;
  snapResiboPriceCents?: number | null;
  snapResiboRewardMinimumCents?: number | null;
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SETTINGS_ADMIN_UNLOCK_KEY) === "1";
  });
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
  /** Driver / Windows enumeration message from API */
  const [printerEnumHint, setPrinterEnumHint] = useState<string | null>(null);
  /** Saved config name when it does not resolve to a Windows queue (for display) */
  const [unmatchedReceiptSavedAs, setUnmatchedReceiptSavedAs] = useState<string | null>(null);
  const [unmatchedStickerSavedAs, setUnmatchedStickerSavedAs] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<"updating" | "restarting" | null>(null);
  const [deviceKeyConfig, setDeviceKeyConfig] = useState<{ configured: boolean; masked?: string } | null>(null);
  const [deviceKeyInput, setDeviceKeyInput] = useState("");
  const [deviceKeySaving, setDeviceKeySaving] = useState(false);
  const [deviceKeyMessage, setDeviceKeyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [ownerUnlocked, setOwnerUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(OWNER_UNLOCK_KEY) === "1";
  });
  const [ownerPasswordModal, setOwnerPasswordModal] = useState(false);
  const [ownerPasswordInput, setOwnerPasswordInput] = useState("");
  const [ownerPasswordError, setOwnerPasswordError] = useState("");
  const versionTapCount = useRef(0);
  const versionTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snapResiboEnabled, setSnapResiboEnabled] = useState(false);
  const [snapResiboPriceCents, setSnapResiboPriceCents] = useState<number | "">(0);
  const [snapResiboRewardMinimumCents, setSnapResiboRewardMinimumCents] = useState<number | "">(0);
  const [snapResiboSaving, setSnapResiboSaving] = useState(false);
  const [snapResiboImporting, setSnapResiboImporting] = useState(false);
  const [snapResiboImportResult, setSnapResiboImportResult] = useState<string | null>(null);
  const [snapResiboAvailableCount, setSnapResiboAvailableCount] = useState<number | null>(null);
  const [snapResiboUsedCount, setSnapResiboUsedCount] = useState<number | null>(null);
  const [snapResiboTotalCount, setSnapResiboTotalCount] = useState<number | null>(null);
  const [publicSnapResiboEnabled, setPublicSnapResiboEnabled] = useState<boolean | null>(null);

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
      const headers: Record<string, string> = {};
      if (staffKey) headers["x-staff-key"] = staffKey;
      const [configRes, availableRes] = await Promise.all([
        fetch("/api/system/printers", { cache: "no-store", headers }),
        fetch("/api/system/printers/available", { cache: "no-store", headers }),
      ]);
      const configData = await configRes.json();
      const availableData = await availableRes.json();
      if (configRes.ok) {
        setReceiptPrinter(
          typeof configData.receiptPrinterSelectValue === "string"
            ? configData.receiptPrinterSelectValue
            : configData.receiptPrinter ?? ""
        );
        setStickerPrinter(
          typeof configData.stickerPrinterSelectValue === "string"
            ? configData.stickerPrinterSelectValue
            : configData.stickerPrinter ?? ""
        );
        setStickerWidthMm(Number(configData.stickerWidthMm) || 80);
        setStickerHeightMm(Number(configData.stickerHeightMm) || 60);
        if (Array.isArray(configData.enumeration?.windowsPrinterNamesExact)) {
          setAvailablePrinters(configData.enumeration.windowsPrinterNamesExact);
        }
        const hintFromConfig =
          typeof configData.enumeration?.hint === "string" ? configData.enumeration.hint.trim() : "";
        const hintFromAvailable =
          typeof availableData.enumeration?.hint === "string" ? availableData.enumeration.hint.trim() : "";
        setPrinterEnumHint(hintFromConfig || hintFromAvailable || null);
        setUnmatchedReceiptSavedAs(
          configData.savedReceiptNotMatched && configData.receiptPrinter
            ? String(configData.receiptPrinter)
            : null
        );
        setUnmatchedStickerSavedAs(
          configData.savedStickerNotMatched && configData.stickerPrinter
            ? String(configData.stickerPrinter)
            : null
        );
      } else {
        setUnmatchedReceiptSavedAs(null);
        setUnmatchedStickerSavedAs(null);
        const hintFromAvailable =
          typeof availableData.enumeration?.hint === "string" ? availableData.enumeration.hint.trim() : "";
        setPrinterEnumHint(hintFromAvailable || null);
      }
      if (
        availableRes.ok &&
        Array.isArray(availableData.printers) &&
        (!configRes.ok || !Array.isArray(configData.enumeration?.windowsPrinterNamesExact))
      ) {
        setAvailablePrinters(availableData.printers);
      }
      if (configRes.ok && !configData.enumeration?.hint && availableRes.ok && availableData.enumeration?.hint) {
        const h = String(availableData.enumeration.hint).trim();
        if (h) setPrinterEnumHint(h);
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

  const loadDeviceKeyConfig = useCallback(async () => {
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/device-key", { cache: "no-store", headers });
      const data = await res.json();
      if (res.ok) setDeviceKeyConfig({ configured: data.configured, masked: data.masked });
      else setDeviceKeyConfig(null);
    } catch {
      setDeviceKeyConfig(null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/store-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPublicSnapResiboEnabled(!!d?.snapResiboEnabled))
      .catch(() => setPublicSnapResiboEnabled(null));
  }, []);

  const loadSnapResiboCount = useCallback(async () => {
    try {
      const res = await fetch("/api/snapresibo/vouchers/count", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        const remaining = typeof data.remaining === "number" ? data.remaining : data.count;
        setSnapResiboAvailableCount(typeof remaining === "number" ? remaining : null);
        setSnapResiboUsedCount(typeof data.used === "number" ? data.used : null);
        setSnapResiboTotalCount(typeof data.total === "number" ? data.total : null);
      } else {
        setSnapResiboAvailableCount(null);
        setSnapResiboUsedCount(null);
        setSnapResiboTotalCount(null);
      }
    } catch {
      setSnapResiboAvailableCount(null);
      setSnapResiboUsedCount(null);
      setSnapResiboTotalCount(null);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadStatus();
      loadPrinters();
      loadCategories();
      loadDeviceKeyConfig();
      const t = setInterval(loadStatus, 5000);
      return () => clearInterval(t);
    }
  }, [isAuthenticated, loadStatus, loadPrinters, loadCategories, loadDeviceKeyConfig]);

  useEffect(() => {
    if (isAuthenticated && config?.snapResiboEnabled) loadSnapResiboCount();
  }, [isAuthenticated, config?.snapResiboEnabled, loadSnapResiboCount]);

  useEffect(() => {
    if (publicSnapResiboEnabled === true) loadSnapResiboCount();
  }, [publicSnapResiboEnabled, loadSnapResiboCount]);

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
      setSnapResiboEnabled(!!data.snapResiboEnabled);
      setSnapResiboPriceCents(data.snapResiboPriceCents ?? "");
      setSnapResiboRewardMinimumCents(data.snapResiboRewardMinimumCents ?? "");
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
        sessionStorage.setItem(SETTINGS_ADMIN_UNLOCK_KEY, "1");
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
    const out: Record<string, string> = {};
    if (staffKey) out["x-staff-key"] = staffKey;
    return out;
  }

  async function handleSaveDeviceKey() {
    setDeviceKeyMessage(null);
    const key = deviceKeyInput.trim();
    if (!key) {
      setDeviceKeyMessage({ type: "error", text: "Enter a device key" });
      return;
    }
    setDeviceKeySaving(true);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/device-key", {
        method: "PUT",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save");
      setDeviceKeyInput("");
      setDeviceKeyMessage({ type: "success", text: "Device key saved" });
      await loadDeviceKeyConfig();
      if (status) await loadStatus();
    } catch (e: unknown) {
      setDeviceKeyMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setDeviceKeySaving(false);
    }
  }

  async function handleClearDeviceKey() {
    if (!confirm("Clear the stored device key? Remote commands will stop until a key is set again.")) return;
    setDeviceKeyMessage(null);
    setDeviceKeySaving(true);
    try {
      const headers = await getStaffHeaders();
      const res = await fetch("/api/device-key", { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to clear");
      setDeviceKeyInput("");
      setDeviceKeyMessage({ type: "success", text: "Device key cleared" });
      await loadDeviceKeyConfig();
      if (status) await loadStatus();
    } catch (e: unknown) {
      setDeviceKeyMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to clear" });
    } finally {
      setDeviceKeySaving(false);
    }
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
      setReceiptPrinter(
        typeof data.receiptPrinterSelectValue === "string" ? data.receiptPrinterSelectValue : data.receiptPrinter ?? ""
      );
      setStickerPrinter(
        typeof data.stickerPrinterSelectValue === "string" ? data.stickerPrinterSelectValue : data.stickerPrinter ?? ""
      );
      if (Array.isArray(data.enumeration?.windowsPrinterNamesExact)) {
        setAvailablePrinters(data.enumeration.windowsPrinterNamesExact);
      }
      const h = typeof data.enumeration?.hint === "string" ? data.enumeration.hint.trim() : "";
      setPrinterEnumHint(h || null);
      setUnmatchedReceiptSavedAs(
        data.savedReceiptNotMatched && data.receiptPrinter ? String(data.receiptPrinter) : null
      );
      setUnmatchedStickerSavedAs(
        data.savedStickerNotMatched && data.stickerPrinter ? String(data.stickerPrinter) : null
      );
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
        body: "{}",
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
          devMode: config?.devMode ?? false,
          snapResiboEnabled,
          snapResiboPriceCents: snapResiboPriceCents === "" ? null : Number(snapResiboPriceCents),
          snapResiboRewardMinimumCents: snapResiboRewardMinimumCents === "" ? null : Number(snapResiboRewardMinimumCents),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Save failed. Sign in at the Register first, then try saving again."
            : data.error || data.message || "Failed to save config";
        throw new Error(msg);
      }

      setConfig(data);
      setStickerPrintCategoryIds(Array.isArray(data.stickerPrintCategoryIds) ? data.stickerPrintCategoryIds : []);
      setSnapResiboEnabled(!!data.snapResiboEnabled);
      setSnapResiboPriceCents(data.snapResiboPriceCents ?? "");
      setSnapResiboRewardMinimumCents(data.snapResiboRewardMinimumCents ?? "");
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

  function parseCsvForVoucherIds(text: string): string[] {
    const VCHR_PREFIX = "VCHR_";
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let start = 0;
    if (lines.length > 0 && lines[0].toLowerCase().includes("voucher")) start = 1;
    const ids: string[] = [];
    for (let i = start; i < lines.length; i++) {
      const id = lines[i].split(",")[0].trim();
      if (id.startsWith(VCHR_PREFIX) && id.length >= 10) ids.push(id);
    }
    return ids;
  }

  async function handleSnapResiboImport(file: File) {
    setSnapResiboImportResult(null);
    setSnapResiboImporting(true);
    try {
      const text = await file.text();
      const voucherIds = parseCsvForVoucherIds(text);
      if (voucherIds.length === 0) {
        setSnapResiboImportResult("No valid voucher IDs (VCHR_...) found in file.");
        return;
      }
      const res = await fetch("/api/snapresibo/vouchers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSnapResiboImportResult(data?.message || data?.error || "Import failed");
        return;
      }
      const cleared =
        typeof data.clearedAvailable === "number" && data.clearedAvailable > 0
          ? ` Cleared ${data.clearedAvailable} old available voucher(s).`
          : "";
      setSnapResiboImportResult(`Imported: ${data.added} added, ${data.skipped} skipped.${cleared}`);
      loadSnapResiboCount();
    } catch (e) {
      setSnapResiboImportResult(e instanceof Error ? e.message : "Import failed");
    } finally {
      setSnapResiboImporting(false);
    }
  }

  function handleVersionTap() {
    versionTapCount.current += 1;
    if (versionTapTimeout.current) clearTimeout(versionTapTimeout.current);
    versionTapTimeout.current = setTimeout(() => {
      versionTapCount.current = 0;
      versionTapTimeout.current = null;
    }, 2000);
    if (versionTapCount.current >= VERSION_TAP_THRESHOLD) {
      versionTapCount.current = 0;
      if (versionTapTimeout.current) {
        clearTimeout(versionTapTimeout.current);
        versionTapTimeout.current = null;
      }
      setOwnerPasswordModal(true);
      setOwnerPasswordError("");
      setOwnerPasswordInput("");
    }
  }

  async function handleOwnerPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOwnerPasswordError("");
    try {
      const res = await fetch("/api/owner/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: ownerPasswordInput }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem(OWNER_UNLOCK_KEY, "1");
        setOwnerUnlocked(true);
        setOwnerPasswordModal(false);
        setOwnerPasswordInput("");
      } else {
        setOwnerPasswordError(data.message || "Invalid owner password");
        setOwnerPasswordInput("");
      }
    } catch (e: unknown) {
      setOwnerPasswordError(e instanceof Error ? e.message : "Verification failed");
      setOwnerPasswordInput("");
    }
  }

  function handleOwnerLock() {
    sessionStorage.removeItem(OWNER_UNLOCK_KEY);
    setOwnerUnlocked(false);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("bfc_pending_owner_tools") === "1") {
      sessionStorage.removeItem("bfc_pending_owner_tools");
      setOwnerPasswordModal(true);
      setOwnerPasswordError("");
      setOwnerPasswordInput("");
    }
  }, []);

  // PIN Gate - same pattern as Transactions
  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          height: "100%",
          padding: "clamp(12px, 3vw, 24px)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
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
            width: "100%",
            maxWidth: 420,
            boxSizing: "border-box",
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

        {publicSnapResiboEnabled === true && (
          <div
            style={{
              background: COLORS.bgDark,
              padding: 24,
              borderRadius: 12,
              border: `1px solid ${COLORS.borderLight}`,
              width: "100%",
              maxWidth: 420,
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
              SnapResibo
            </h2>
            <p style={{ margin: "0 0 16px 0", color: COLORS.textSecondary, fontSize: 13 }}>
              Import vouchers from CSV or Excel files.
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSnapResiboImport(f);
                e.target.value = "";
              }}
              disabled={snapResiboImporting}
              style={{ marginBottom: 12, fontSize: 14 }}
            />
            {snapResiboImporting && <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>Importing…</p>}
            {snapResiboImportResult && (
              <p style={{ fontSize: 14, color: COLORS.primary }}>{snapResiboImportResult}</p>
            )}
            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 14, color: COLORS.textSecondary }}>
              {snapResiboAvailableCount !== null ? (
                <>Remaining vouchers: <strong style={{ color: COLORS.textPrimary }}>{snapResiboAvailableCount}</strong></>
              ) : (
                "Remaining vouchers: —"
              )}
            </p>
          </div>
        )}

        <div
          style={{
            background: COLORS.bgDark,
            padding: 32,
            borderRadius: 12,
            border: `1px solid ${COLORS.borderLight}`,
            width: "100%",
            maxWidth: 420,
            boxSizing: "border-box",
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
        {ownerPasswordModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              padding: 24,
            }}
            onClick={() => setOwnerPasswordModal(false)}
          >
            <div
              style={{
                maxWidth: 360,
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
                Owner Tools
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: 14, color: COLORS.textSecondary }}>
                Enter owner password to access developer/system tools.
              </p>
              <form onSubmit={handleOwnerPasswordSubmit}>
                <input
                  type="password"
                  value={ownerPasswordInput}
                  onChange={(e) => setOwnerPasswordInput(e.target.value)}
                  placeholder="Owner password"
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    marginBottom: 12,
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                  }}
                />
                {ownerPasswordError && (
                  <div style={{ color: COLORS.error, marginBottom: 12, fontSize: 14 }}>{ownerPasswordError}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 15,
                      fontWeight: 600,
                      background: COLORS.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerPasswordModal(false)}
                    style={{
                      padding: "12px 16px",
                      fontSize: 15,
                      background: COLORS.bgDark,
                      color: COLORS.textSecondary,
                      border: `1px solid ${COLORS.borderLight}`,
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
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
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "clamp(12px, 2.5vw, 24px)",
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
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
            onClick={() => {
              sessionStorage.removeItem(SETTINGS_ADMIN_UNLOCK_KEY);
              setIsAuthenticated(false);
            }}
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
            SnapResibo
          </h2>
          <p style={{ color: COLORS.textSecondary, marginBottom: 16, fontSize: 14 }}>
            When enabled, a SnapResibo category appears in the POS (rightmost). Customers can buy a SnapResibo QR or get one free when the order reaches the reward minimum. Save with the main &quot;Save Changes&quot; button below.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={snapResiboEnabled}
              onChange={(e) => setSnapResiboEnabled(e.target.checked)}
              style={{ width: 20, height: 20, cursor: "pointer" }}
            />
            <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>Enable SnapResibo</span>
          </label>
          <p style={{ color: COLORS.textMuted, marginBottom: 16, fontSize: 12 }}>
            Turns SnapResibo features on or off on this device.
          </p>
          {snapResiboEnabled && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: COLORS.textSecondary }}>
                  SnapResibo price (PHP)
                </label>
                <p style={{ margin: "0 0 6px 0", color: COLORS.textMuted, fontSize: 12 }}>
                  Selling price for the SnapResibo QR item.
                </p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={snapResiboPriceCents === "" ? "" : Number(snapResiboPriceCents) / 100}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setSnapResiboPriceCents("");
                    else setSnapResiboPriceCents(Math.round(parseFloat(v) * 100) || 0);
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 120,
                    padding: 10,
                    fontSize: 14,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: COLORS.textSecondary }}>
                  Reward minimum amount (PHP)
                </label>
                <p style={{ margin: "0 0 6px 0", color: COLORS.textMuted, fontSize: 12 }}>
                  Minimum receipt total required to print a free SnapResibo QR.
                </p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={snapResiboRewardMinimumCents === "" ? "" : Number(snapResiboRewardMinimumCents) / 100}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setSnapResiboRewardMinimumCents("");
                    else setSnapResiboRewardMinimumCents(Math.round(parseFloat(v) * 100) || 0);
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 120,
                    padding: 10,
                    fontSize: 14,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              {(snapResiboAvailableCount !== null || snapResiboUsedCount !== null) && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: "0 0 4px 0" }}>
                    Remaining vouchers: {snapResiboAvailableCount ?? "—"}
                  </p>
                  <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0 }}>
                    Vouchers used: {snapResiboUsedCount ?? "—"}
                  </p>
                  {snapResiboTotalCount != null &&
                    snapResiboTotalCount > 0 &&
                    typeof snapResiboAvailableCount === "number" &&
                    snapResiboAvailableCount / snapResiboTotalCount < 0.1 && (
                      <p
                        style={{
                          fontSize: 13,
                          color: COLORS.warning,
                          marginTop: 8,
                          marginBottom: 0,
                          fontWeight: 500,
                        }}
                      >
                        Low SnapResibo vouchers: below 10% remaining. Import more soon.
                      </p>
                    )}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: saving ? COLORS.bgDark : COLORS.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save SnapResibo settings"}
                </button>
                <p style={{ margin: "8px 0 0 0", fontSize: 12, color: COLORS.textMuted }}>
                  Click Save to keep changes. Use the main Save below to save all settings together.
                </p>
              </div>
            </>
          )}
        </div>

        {ownerUnlocked && (
          <OwnerToolsClient onLock={handleOwnerLock} />
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
                <dd
                  style={{ margin: 0, cursor: "pointer", userSelect: "none" }}
                  onClick={handleVersionTap}
                  title="Tap 7 times for owner tools"
                >
                  {WEB_VERSION}
                </dd>
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

        {/* Device Key */}
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
            Device key
          </h2>
          <p style={{ color: COLORS.textSecondary, marginBottom: 16, fontSize: 14 }}>
            Used for remote POS control (updates, restart, sync from Cloud Admin). Set the key from Cloud Admin → POS Settings → POS Devices after adding a device.
          </p>
          {deviceKeyConfig ? (
            <>
              <div style={{ marginBottom: 12 }}>
                {deviceKeyConfig.configured ? (
                  <p style={{ fontSize: 14, color: COLORS.textPrimary }}>
                    Status: <span style={{ color: COLORS.success }}>Configured</span>
                    {deviceKeyConfig.masked && (
                      <span style={{ marginLeft: 8, color: COLORS.textSecondary }}>({deviceKeyConfig.masked})</span>
                    )}
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: COLORS.textSecondary }}>Status: Not configured</p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="password"
                  value={deviceKeyInput}
                  onChange={(e) => setDeviceKeyInput(e.target.value)}
                  placeholder="Paste device key to set or replace"
                  autoComplete="off"
                  style={{
                    padding: "10px 12px",
                    fontSize: 14,
                    background: COLORS.bgDark,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    color: COLORS.textPrimary,
                  }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleSaveDeviceKey}
                    disabled={deviceKeySaving}
                    style={{
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 600,
                      background: deviceKeySaving ? COLORS.bgDark : COLORS.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: deviceKeySaving ? "not-allowed" : "pointer",
                    }}
                  >
                    {deviceKeySaving ? "Saving…" : "Save / Update key"}
                  </button>
                  {deviceKeyConfig.configured && (
                    <button
                      type="button"
                      onClick={handleClearDeviceKey}
                      disabled={deviceKeySaving}
                      style={{
                        padding: "10px 16px",
                        fontSize: 14,
                        background: COLORS.bgDark,
                        color: COLORS.textSecondary,
                        border: `1px solid ${COLORS.borderLight}`,
                        borderRadius: 6,
                        cursor: deviceKeySaving ? "not-allowed" : "pointer",
                      }}
                    >
                      Clear key
                    </button>
                  )}
                </div>
              </div>
              {deviceKeyMessage && (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: deviceKeyMessage.type === "error" ? COLORS.error : COLORS.success,
                  }}
                >
                  {deviceKeyMessage.text}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>Loading…</p>
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
          {printerEnumHint ? (
            <p style={{ color: COLORS.error, marginBottom: 12, fontSize: 13 }}>{printerEnumHint}</p>
          ) : null}
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
              {unmatchedReceiptSavedAs ? (
                <p style={{ marginTop: 6, fontSize: 12, color: COLORS.error }}>
                  Saved name does not match any Windows queue: &quot;{unmatchedReceiptSavedAs}&quot;. Choose the exact name from the list.
                </p>
              ) : null}
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
              {unmatchedStickerSavedAs ? (
                <p style={{ marginTop: 6, fontSize: 12, color: COLORS.error }}>
                  Saved name does not match any Windows queue: &quot;{unmatchedStickerSavedAs}&quot;. Choose the exact name from the list.
                </p>
              ) : null}
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

      </div>

      {ownerPasswordModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            padding: 24,
          }}
          onClick={() => setOwnerPasswordModal(false)}
        >
          <div
            style={{
              maxWidth: 360,
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
              Owner Tools
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: 14, color: COLORS.textSecondary }}>
              Enter owner password to access developer/system tools.
            </p>
            <form onSubmit={handleOwnerPasswordSubmit}>
              <input
                type="password"
                value={ownerPasswordInput}
                onChange={(e) => setOwnerPasswordInput(e.target.value)}
                placeholder="Owner password"
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 16,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 6,
                  marginBottom: 12,
                  background: COLORS.bgDark,
                  color: COLORS.textPrimary,
                }}
              />
              {ownerPasswordError && (
                <div style={{ color: COLORS.error, marginBottom: 12, fontSize: 14 }}>{ownerPasswordError}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    background: COLORS.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Unlock
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerPasswordModal(false)}
                  style={{
                    padding: "12px 16px",
                    fontSize: 15,
                    background: COLORS.bgDark,
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
