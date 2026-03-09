"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { api, type SyncedTransactionRow, type DailyReport, type MonthlyReport } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const TABS = ["Transactions", "Hourly", "Daily", "Monthly"] as const;
type TabId = (typeof TABS)[number];

const PAYMENT_COLORS: Record<string, string> = {
  CASH: "#22c55e",
  CARD: "#f97316",
  GCASH: "#3b82f6",
  PAYMONGO: "#6366f1",
  FOODPANDA: "#ec4899",
  GRABFOOD: "#10b981",
  BFCAPP: "#f59e0b",
};

function getPaymentColor(method: string): string {
  return PAYMENT_COLORS[method] ?? "#6b7280";
}

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function TransactionsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "Transactions";
  const activeTab = TABS.includes(tabParam as TabId) ? (tabParam as TabId) : "Transactions";

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [transactions, setTransactions] = useState<SyncedTransactionRow[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function handleGo() {
    setError("");
    if (activeTab === "Transactions" && from && to && from > to) {
      setError("From date must be before or equal to To date");
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "Transactions") {
        const res = await api.getTransactions({ from, to, limit: 50 });
        setTransactions(res.items);
        setNextCursor(res.nextCursor);
      } else if (activeTab === "Daily") {
        const r = await api.getDailyReport({ date });
        setDailyReport(r);
      } else if (activeTab === "Monthly") {
        const r = await api.getMonthlyReport({ year, month });
        setMonthlyReport(r);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (activeTab === "Transactions" && from && to && !hasAutoLoaded.current) {
      hasAutoLoaded.current = true;
      handleGo();
    }
  }, [activeTab, from, to]);

  async function handleExportExcel() {
    if (from > to) {
      setError("From date must be before or equal to To date");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { items } = await api.getTransactionsExport({ from, to });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(items);
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      const filename = `transactions_${from}_to_${to}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (e) {
      const body = (e as { body?: { message?: string; error?: string } })?.body;
      const msg = body?.message ?? body?.error ?? (e instanceof Error ? e.message : "Export failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    const el = document.getElementById("report-print");
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Report</title>
      <style>body{font-family:sans-serif;padding:24px;color:#222} table{border-collapse:collapse;width:100%} th,td{border:1px solid #333;padding:8px;text-align:left}</style>
      </head><body>${el.innerHTML}</body></html>
    `);
    w.document.close();
    w.print();
    w.close();
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: COLORS.bgDark, color: "#ddd" }}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-semibold text-white">Transactions</h1>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          {activeTab === "Transactions" && (
            <>
              <div>
                <label className="mb-1 block text-xs text-white/70">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded border px-3 py-2 text-sm"
                  style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight, color: "#fff" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/70">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded border px-3 py-2 text-sm"
                  style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight, color: "#fff" }}
                />
              </div>
            </>
          )}
          {activeTab === "Daily" && (
            <div>
              <label className="mb-1 block text-xs text-white/70">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
                style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight, color: "#fff" }}
              />
            </div>
          )}
          {activeTab === "Monthly" && (
            <>
              <div>
                <label className="mb-1 block text-xs text-white/70">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  className="w-24 rounded border px-3 py-2 text-sm"
                  style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight, color: "#fff" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/70">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="rounded border px-3 py-2 text-sm"
                  style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight, color: "#fff" }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {new Date(2000, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {(activeTab === "Transactions" || activeTab === "Daily" || activeTab === "Monthly") && (
            <>
              <button
                type="button"
                onClick={handleGo}
                disabled={loading}
                className="rounded px-4 py-2 text-sm font-medium text-black"
                style={{ background: COLORS.primary }}
              >
                {loading ? "Loading..." : "Go"}
              </button>
              {activeTab === "Transactions" && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={loading || !from || !to || from > to}
                  className="rounded border px-4 py-2 text-sm"
                  style={{ borderColor: COLORS.borderLight, color: "#ddd" }}
                >
                  Export Excel
                </button>
              )}
              {(activeTab === "Daily" || activeTab === "Monthly") && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded border px-4 py-2 text-sm"
                  style={{ borderColor: COLORS.borderLight, color: "#ddd" }}
                >
                  Download / Print
                </button>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b" style={{ borderColor: COLORS.borderLight }}>
          {TABS.map((tab) => (
            <a
              key={tab}
              href={`/transactions?tab=${tab}`}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderBottom: activeTab === tab ? `2px solid ${COLORS.primary}` : "2px solid transparent",
                color: activeTab === tab ? COLORS.primary : "#888",
              }}
            >
              {tab}
            </a>
          ))}
        </div>

        {/* Content */}
        {error && (
          <div
            className="mb-4 rounded border p-4"
            style={{ background: "#7f1d1d20", borderColor: "#ef4444", color: "#fecaca" }}
          >
            {error}
          </div>
        )}

        <div style={{ background: COLORS.bgPanel, borderRadius: 8, border: `1px solid ${COLORS.borderLight}`, overflow: "hidden" }}>
          {activeTab === "Hourly" && (
            <div className="p-8 text-center text-white/70">
              <p>Hourly breakdown coming soon.</p>
            </div>
          )}

          {activeTab === "Transactions" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: "#1a1a1a", borderBottom: `2px solid ${COLORS.borderLight}` }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Receipt No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Cashier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Payment</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/70">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                        Loading...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                        No transactions found. Ensure POS sync is configured (CLOUD_URL, STORE_SYNC_SECRET).
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const methods = [...new Set(tx.payments.map((p) => p.method))];
                      const primaryMethod = methods[0] || "CASH";
                      return (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom: `1px solid ${COLORS.borderLight}`,
                            opacity: tx.status === "VOID" ? 0.5 : 1,
                          }}
                        >
                          <td className="px-4 py-3 text-sm">{formatDate(tx.createdAt)}</td>
                          <td className="px-4 py-3 text-sm">{formatTime(tx.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-sm">{tx.transactionNo}</td>
                          <td className="px-4 py-3 text-sm">{tx.cashierName || "—"}</td>
                          <td className="px-4 py-3 text-sm">{tx.itemsCount}</td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white"
                              style={{ background: getPaymentColor(primaryMethod) }}
                            >
                              {methods.length > 1 ? "SPLIT" : primaryMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-400">
                            {formatPesos(tx.totalCents)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "Daily" && dailyReport && (
            <div id="report-print" className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Daily Z-Reading</h2>
              <p className="mb-4 text-sm text-white/70">Date: {dailyReport.date}</p>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Transactions</td>
                    <td className="py-2 text-right">{dailyReport.transactionCount}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Items Sold</td>
                    <td className="py-2 text-right">{dailyReport.itemsCount}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Total Sales</td>
                    <td className="py-2 text-right font-semibold text-green-400">{formatPesos(dailyReport.totalSales)}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Discounts</td>
                    <td className="py-2 text-right">{formatPesos(dailyReport.totalDiscounts)}</td>
                  </tr>
                  {Object.entries(dailyReport.byPaymentMethod).map(([method, cents]) => (
                    <tr key={method} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <td className="py-2 text-white/70">{method}</td>
                      <td className="py-2 text-right">{formatPesos(cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "Monthly" && monthlyReport && (
            <div id="report-print" className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Monthly Report</h2>
              <p className="mb-4 text-sm text-white/70">
                {monthlyReport.year} – {new Date(2000, monthlyReport.month - 1).toLocaleString("default", { month: "long" })}
              </p>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Transactions</td>
                    <td className="py-2 text-right">{monthlyReport.transactionCount}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Items Sold</td>
                    <td className="py-2 text-right">{monthlyReport.itemsCount}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Total Sales</td>
                    <td className="py-2 text-right font-semibold text-green-400">{formatPesos(monthlyReport.totalSales)}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td className="py-2 text-white/70">Discounts</td>
                    <td className="py-2 text-right">{formatPesos(monthlyReport.totalDiscounts)}</td>
                  </tr>
                  {Object.entries(monthlyReport.byPaymentMethod).map(([method, cents]) => (
                    <tr key={method} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <td className="py-2 text-white/70">{method}</td>
                      <td className="py-2 text-right">{formatPesos(cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(activeTab === "Daily" || activeTab === "Monthly") && !loading && !dailyReport && !monthlyReport && !error && (
            <div className="p-8 text-center text-white/50">Click Go to load report.</div>
          )}
        </div>
      </div>
    </div>
  );
}
