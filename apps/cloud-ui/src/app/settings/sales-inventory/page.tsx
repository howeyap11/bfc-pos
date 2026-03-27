"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const INVENTORY_TYPES = ["Ingredients Input Based"] as const;

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export default function SalesInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTipsBanner, setShowTipsBanner] = useState(true);

  const [reportRecipientEmail, setReportRecipientEmail] = useState("");
  const [dailySalesEmailTimeLocal, setDailySalesEmailTimeLocal] = useState("00:30");
  const [inventoryEmailEnabled, setInventoryEmailEnabled] = useState(false);
  const [inventoryReportType, setInventoryReportType] = useState("Ingredients Input Based");
  const [fixedServiceChargePercent, setFixedServiceChargePercent] = useState(10);

  const load = useCallback(async () => {
    setError("");
    const d = await api.getSalesInventorySettings();
    setReportRecipientEmail(d.reportRecipientEmail ?? "");
    setDailySalesEmailTimeLocal(d.dailySalesEmailTimeLocal || "00:30");
    setInventoryEmailEnabled(d.inventoryEmailEnabled);
    setInventoryReportType(d.inventoryReportType || "Ingredients Input Based");
    setFixedServiceChargePercent(d.fixedServiceChargePercent ?? 10);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load sales & inventory settings"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.putSalesInventorySettings({
        reportRecipientEmail,
        dailySalesEmailTimeLocal,
        inventoryEmailEnabled,
        inventoryReportType,
      });
      await load();
      setSuccess("Saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = "w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40";
  const inputBg = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };
  const yellowBanner =
    "mb-4 flex items-start justify-between gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100";
  const blueBanner =
    "mb-4 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-100";

  const emailForCopy = reportRecipientEmail.trim() || "the address below";

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Sales & Inventory</h1>
      <p className="mb-4 text-sm text-white/60">Configure service charge, automated sales reports, and inventory email.</p>

      {showTipsBanner && (
        <div className={yellowBanner}>
          <span>Hover over the (i) icon to review available functions.</span>
          <button
            type="button"
            onClick={() => setShowTipsBanner(false)}
            className="shrink-0 text-amber-200/80 hover:text-amber-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">{success}</div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      {loading && <p className="mb-4 text-sm text-white/60">Loading…</p>}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-lg border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}>
          <h2 className="mb-1 text-sm font-semibold text-white">Set Fixed Service Charge</h2>
          <p className="mb-4 text-xs text-white/55">
            Setting a fixed value disables editing of percentage value on the POS tablet, but may still be enabled or disabled
            every transaction.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/80">Fixed Service Charge %:</label>
            <input
              type="number"
              readOnly
              disabled
              value={fixedServiceChargePercent}
              className={inputStyle + " max-w-[5rem] cursor-not-allowed opacity-80"}
              style={inputBg}
            />
            <LockIcon className="text-white/40" />
          </div>
        </div>

        <div className="rounded-lg border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}>
          <div className={blueBanner}>
            To enable daily sales email, use a valid address (Gmail works well). Set the send time below. If you do not see
            messages, check Spam, Junk, and Promotions.
          </div>

          <h2 className="mb-1 text-sm font-semibold text-white">Automated Email Reports</h2>
          <p className="mb-4 text-xs text-white/55">
            This address receives daily sales reports. When inventory email is on, it uses the same recipient.
          </p>

          <div className="mb-4 space-y-1 rounded border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
            <p className="font-medium text-white/75">How the daily sales email lines up with closing</p>
            <p>
              The operating day is counted as <strong className="text-white/85">8:00 AM through 12:00 AM (midnight)</strong>.
              The store day closes at <strong className="text-white/85">12:00 AM</strong>. The daily sales email at{" "}
              <strong className="text-white/85">{dailySalesEmailTimeLocal}</strong> is sent just after close and is meant to
              reflect that <strong className="text-white/85">completed</strong> day (not the new calendar day that started at
              midnight).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-white/80">CC sales email only</label>
                <span title="Recipient for automated daily sales and inventory emails." className="text-white/40">
                  <InfoIcon />
                </span>
              </div>
              <input
                type="email"
                value={reportRecipientEmail}
                onChange={(e) => setReportRecipientEmail(e.target.value)}
                placeholder="Enter your cc sales email"
                autoComplete="email"
                className={inputStyle}
                style={inputBg}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium text-white/80">Set the daily sales email time</label>
                <span title="Local store time (24h). Default 00:30 is shortly after midnight close." className="text-white/40">
                  <InfoIcon />
                </span>
              </div>
              <input
                type="time"
                step={60}
                value={dailySalesEmailTimeLocal}
                onChange={(e) => setDailySalesEmailTimeLocal(e.target.value)}
                className={inputStyle + " max-w-[10rem]"}
                style={inputBg}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Resend daily sales email</label>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" disabled className={inputStyle + " max-w-[11rem] cursor-not-allowed opacity-50"} style={inputBg} />
                <button
                  type="button"
                  disabled
                  className="rounded px-3 py-2 text-sm font-medium text-black/50"
                  style={{ background: COLORS.primary }}
                  title="Resend will be available when the mailer job supports it."
                >
                  Send
                </button>
              </div>
              <p className="mt-1 text-xs text-white/40">Manual resend is not wired yet; configuration is saved above.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}>
          <h2 className="mb-1 text-sm font-semibold text-white">Inventory</h2>
          <p className="mb-4 text-xs text-white/55">
            Enabling inventory email will send a daily inventory report to <strong className="text-white/80">{emailForCopy}</strong>{" "}
            after midnight when this feature is active (same recipient as sales reports).
          </p>

          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-white/80">Enable Inventory Email</span>
            <button
              type="button"
              role="switch"
              aria-checked={inventoryEmailEnabled}
              onClick={() => setInventoryEmailEnabled(!inventoryEmailEnabled)}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
              style={{ background: inventoryEmailEnabled ? COLORS.primary : "rgba(255,255,255,0.2)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                style={{ transform: inventoryEmailEnabled ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Set your inventory type</label>
            <select
              value={inventoryReportType}
              onChange={(e) => setInventoryReportType(e.target.value)}
              className={inputStyle}
              style={inputBg}
            >
              {INVENTORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          style={{ background: COLORS.primary }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
