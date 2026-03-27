"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const TAX_TYPES = ["NONVAT Registered", "VAT Registered"] as const;

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

export default function ReceiptsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [ownerTradeName, setOwnerTradeName] = useState("");
  const [taxType, setTaxType] = useState<string>("NONVAT Registered");
  const [receiptMessage, setReceiptMessage] = useState("");
  const [birEnabled, setBirEnabled] = useState(true);
  const [permitNo, setPermitNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [nonVatTin, setNonVatTin] = useState("");
  const [vatTin, setVatTin] = useState("");
  const [birMin, setBirMin] = useState("");
  const [birSerialNo, setBirSerialNo] = useState("");

  const birRegulatoryLocked = birEnabled;

  const load = useCallback(async () => {
    setError("");
    const data = await api.getReceiptDetails();
    setOwnerTradeName(data.ownerTradeName ?? "");
    setTaxType(data.taxType || "NONVAT Registered");
    setReceiptMessage(data.receiptMessage ?? "");
    setBirEnabled(data.birEnabled);
    setPermitNo(data.permitNo ?? "");
    setIssueDate(data.issueDate ?? "");
    setNonVatTin(data.nonVatTin ?? "");
    setVatTin(data.vatTin ?? "");
    setBirMin(data.birMin ?? "");
    setBirSerialNo(data.birSerialNo ?? "");
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load receipt settings"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.putReceiptDetails({
        receiptMessage: receiptMessage.trim() || null,
        birEnabled,
        taxType,
        permitNo: permitNo.trim() || null,
        issueDate: issueDate.trim() || null,
        nonVatTin: nonVatTin.trim() || null,
        vatTin: vatTin.trim() || null,
        birMin: birMin.trim() || null,
        birSerialNo: birSerialNo.trim() || null,
      });
      setOwnerTradeName(res.ownerTradeName ?? "");
      setTaxType(res.taxType);
      setReceiptMessage(res.receiptMessage ?? "");
      setBirEnabled(res.birEnabled);
      setPermitNo(res.permitNo ?? "");
      setIssueDate(res.issueDate ?? "");
      setNonVatTin(res.nonVatTin ?? "");
      setVatTin(res.vatTin ?? "");
      setBirMin(res.birMin ?? "");
      setBirSerialNo(res.birSerialNo ?? "");
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
  const bannerClass =
    "mb-4 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100";

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Receipt Details</h1>
      <p className="mb-4 text-sm text-white/60">Receipt header, footer, and BIR information for printed receipts.</p>

      <div className={bannerClass}>
        Hover over the (i) icon to review available functions.
      </div>

      {success && (
        <div className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">{success}</div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      {loading && <p className="mb-4 text-sm text-white/60">Loading…</p>}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-lg border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}>
          <div
            className="mb-6 flex min-h-[120px] cursor-default flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center text-sm text-white/50"
            style={{ borderColor: COLORS.borderLight }}
          >
            <span className="mb-1 text-2xl opacity-60">🖼</span>
            Drag and drop, or click to select. Max file size is 5 MB.
            <span className="mt-2 text-xs text-white/40">Logo upload coming soon.</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-white/80">Owner Name</label>
                <span title="Trade name shown on receipts; edit under Business Details." className="text-white/40">
                  <InfoIcon className="inline" />
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={ownerTradeName}
                placeholder="Enter owner/trade name"
                className={inputStyle + " cursor-not-allowed opacity-90"}
                style={inputBg}
              />
              <p className="mt-1 text-xs text-white/45">
                Source:{" "}
                <Link href="/settings/business-details" className="text-teal-400 underline">
                  Business Details
                </Link>{" "}
                (business name).
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-white/80">Tax Type</label>
                <span className="flex items-center gap-1 text-white/40">
                  {birRegulatoryLocked && <LockIcon />}
                  <InfoIcon />
                </span>
              </div>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                disabled={birRegulatoryLocked}
                className={inputStyle + (birRegulatoryLocked ? " cursor-not-allowed opacity-80" : "")}
                style={inputBg}
              >
                {TAX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-white/80">Receipt Message</label>
                <InfoIcon className="text-white/40" />
              </div>
              <textarea
                value={receiptMessage}
                onChange={(e) => setReceiptMessage(e.target.value)}
                placeholder="Enter receipt message"
                rows={3}
                className={inputStyle + " resize-none"}
                style={inputBg}
              />
            </div>
          </div>

          {birRegulatoryLocked && (
            <div className={`${bannerClass} mt-6`}>Details may not be changed while BIR PTU is enabled.</div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
            <span className="text-sm font-medium text-white/80">BIR Enabled</span>
            <button
              type="button"
              role="switch"
              aria-checked={birEnabled}
              onClick={() => setBirEnabled(!birEnabled)}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
              style={{ background: birEnabled ? COLORS.primary : "rgba(255,255,255,0.2)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                style={{ transform: birEnabled ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {(
              [
                { label: "Permit No.", value: permitNo, set: setPermitNo },
                { label: "Issue Date", value: issueDate, set: setIssueDate },
                { label: "NON VAT TIN", value: nonVatTin, set: setNonVatTin },
                { label: "VAT TIN", value: vatTin, set: setVatTin },
                { label: "MIN", value: birMin, set: setBirMin },
                { label: "S/N", value: birSerialNo, set: setBirSerialNo },
              ] as const
            ).map(({ label, value, set }) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-white/80">{label}</label>
                  {birRegulatoryLocked && <LockIcon className="text-white/40" />}
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  disabled={birRegulatoryLocked}
                  className={inputStyle + (birRegulatoryLocked ? " cursor-not-allowed opacity-80" : "")}
                  style={inputBg}
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
