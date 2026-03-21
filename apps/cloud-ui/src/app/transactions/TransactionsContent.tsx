"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { api, type SyncedTransactionRow, type DailyReport, type MonthlyReport } from "@/lib/api";
import { COLORS, getPaymentBadgeColor } from "@/lib/theme";

const TABS = ["Transactions", "Hourly", "Daily", "Monthly"] as const;
type TabId = (typeof TABS)[number];

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
  const [hasMore, setHasMore] = useState(false);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  const PAGE_SIZE = 30;
  const canGoPrevious = cursorStack.length > 0;
  const canGoNext = !!nextCursor;

  async function handleGo() {
    setError("");
    if (activeTab === "Transactions" && from && to && from > to) {
      setError("From date must be before or equal to To date");
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "Transactions") {
        const res = await api.getTransactions({ from, to, limit: PAGE_SIZE });
        setTransactions(res.items);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore ?? !!res.nextCursor);
        setCursorStack([]);
        setCurrentCursor(null);
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

  async function handleLoadMore() {
    if (!nextCursor || loading) return;
    setError("");
    setCursorStack((s) => [...s, currentCursor]);
    setLoading(true);
    const cursorToFetch = nextCursor;
    try {
      const res = await api.getTransactions({ from, to, limit: PAGE_SIZE, cursor: cursorToFetch });
      setTransactions(res.items);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore ?? !!res.nextCursor);
      setCurrentCursor(cursorToFetch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
      setCursorStack((s) => s.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadPrevious() {
    if (cursorStack.length === 0 || loading) return;
    setError("");
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((s) => s.slice(0, -1));
    setLoading(true);
    try {
      const res = await api.getTransactions({ from, to, limit: PAGE_SIZE, cursor: prevCursor ?? undefined });
      setTransactions(res.items);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore ?? !!res.nextCursor);
      setCurrentCursor(prevCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load previous");
      setCursorStack((s) => [...s, prevCursor]);
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
      className="min-h-screen p-4 sm:p-6"
      style={{ background: COLORS.bgDark, color: "#ddd" }}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-xl font-semibold text-white sm:text-2xl">Transactions</h1>

        {/* Controls - stack on mobile */}
        <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end">
          {activeTab === "Transactions" && (
            <>
              <div className="w-full sm:w-auto">
                <label className="mb-1 block text-xs text-white/70">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded border px-3 py-2.5 text-base sm:w-auto sm:text-sm"
                  style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight, color: "#fff" }}
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="mb-1 block text-xs text-white/70">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded border px-3 py-2.5 text-base sm:w-auto sm:text-sm"
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
                className="min-h-[44px] rounded px-5 py-3 text-base font-medium text-black sm:min-h-0 sm:py-2 sm:text-sm"
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

        {/* Tabs - finger-friendly on mobile; pagination in same row when Transactions tab */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto border-b sm:gap-4" style={{ borderColor: COLORS.borderLight }}>
          <div className="flex min-w-0 flex-1 gap-0.5 sm:gap-1">
            {TABS.map((tab) => (
              <a
                key={tab}
                href={`/transactions?tab=${tab}`}
                className="min-w-0 flex-1 px-3 py-3 text-center text-xs font-medium transition-colors sm:flex-none sm:px-4 sm:py-2 sm:text-sm"
                style={{
                  borderBottom: activeTab === tab ? `2px solid ${COLORS.primary}` : "2px solid transparent",
                  color: activeTab === tab ? COLORS.primary : "#888",
                }}
              >
                {tab}
              </a>
            ))}
          </div>
          {activeTab === "Transactions" && (canGoPrevious || canGoNext) && (
            <div className="flex shrink-0 gap-2 pb-1">
              <button
                type="button"
                onClick={handleLoadPrevious}
                disabled={loading || !canGoPrevious}
                className="rounded px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm"
                style={{
                  background: canGoPrevious ? COLORS.primary : "#444",
                  color: canGoPrevious ? "#000" : "#888",
                  cursor: canGoPrevious && !loading ? "pointer" : "not-allowed",
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading || !canGoNext}
                className="rounded px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm"
                style={{
                  background: canGoNext ? COLORS.primary : "#444",
                  color: canGoNext ? "#000" : "#888",
                  cursor: canGoNext && !loading ? "pointer" : "not-allowed",
                }}
              >
                Next
              </button>
            </div>
          )}
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
            <div className="flex flex-col">
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr style={{ background: "#1a1a1a", borderBottom: `2px solid ${COLORS.borderLight}` }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Date / ID / Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Receipt #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Cashier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/70">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/70">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                        Loading...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                        No transactions found. Ensure POS sync is configured (CLOUD_URL, STORE_SYNC_SECRET).
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const methods = [...new Set(tx.payments.map((p) => p.method))];
                      const shortId = (tx.sourceTransactionId ?? tx.id).slice(-8);
                      return (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom: `1px solid ${COLORS.borderLight}`,
                            opacity: tx.status === "VOID" ? 0.5 : 1,
                          }}
                        >
                          <td className="px-4 py-3 align-top" style={{ minWidth: 160 }}>
                            <div className="text-sm text-white" style={{ marginBottom: 4 }}>{formatDate(tx.createdAt)}</div>
                            <div className="text-xs font-mono text-white/60" style={{ marginBottom: 8 }}>{shortId}</div>
                            <div className="flex flex-wrap gap-1">
                              {methods.length > 1 ? (
                                <>
                                  <span
                                    className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white"
                                    style={{ background: "#6b7280" }}
                                  >
                                    SPLIT
                                  </span>
                                  {methods.map((m) => (
                                    <span
                                      key={m}
                                      className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white"
                                      style={{ background: getPaymentBadgeColor(m) }}
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span
                                  className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white"
                                  style={{ background: getPaymentBadgeColor(methods[0] || "CASH") }}
                                >
                                  {methods[0] || "CASH"}
                                </span>
                              )}
                            </div>
                            {tx.isTest && (
                              <div className="mt-1.5">
                                <span
                                  className="inline-block rounded px-2 py-0.5 text-xs font-medium text-amber-200"
                                  style={{ background: "rgba(234, 179, 8, 0.25)", border: "1px solid rgba(234, 179, 8, 0.5)" }}
                                >
                                  Test
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-white align-top">{formatTime(tx.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-white align-top">#{tx.transactionNo}</td>
                          <td className="px-4 py-3 text-sm text-white align-top">{tx.cashierName || "—"}</td>
                          <td className="px-4 py-3 align-top" style={{ minWidth: 200 }}>
                            <div className="flex flex-col gap-1">
                              {tx.lineItems && tx.lineItems.length > 0 ? (
                                tx.lineItems.map((line, idx) => {
                                  const itemOnly =
                                    line.displayLabel != null
                                      ? line.displayLabel.replace(/\s*x\d+$/i, "").trim() || line.name
                                      : line.name;
                                  const mainLabel = `${line.qty}× ${itemOnly}`;
                                  return (
                                    <div key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 text-sm text-white">
                                      <div className="min-w-0">
                                        <div className="min-w-0 break-words font-medium">{mainLabel}</div>
                                      </div>
                                      <span className="shrink-0 self-start text-right text-green-400 whitespace-nowrap">{formatPesos(line.lineTotal)}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-sm text-white/60">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <span className="text-sm font-semibold text-green-400">{formatPesos(tx.totalCents)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
              {(canGoPrevious || canGoNext) && (
                <div className="flex justify-end gap-2 border-t px-4 py-3" style={{ borderColor: COLORS.borderLight }}>
                  <button
                    type="button"
                    onClick={handleLoadPrevious}
                    disabled={loading || !canGoPrevious}
                    className="rounded px-4 py-2 text-sm font-medium"
                    style={{
                      background: canGoPrevious ? COLORS.primary : "#444",
                      color: canGoPrevious ? "#000" : "#888",
                      cursor: canGoPrevious && !loading ? "pointer" : "not-allowed",
                    }}
                  >
                    {loading ? "Loading..." : "Previous"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading || !canGoNext}
                    className="rounded px-4 py-2 text-sm font-medium"
                    style={{
                      background: canGoNext ? COLORS.primary : "#444",
                      color: canGoNext ? "#000" : "#888",
                      cursor: canGoNext && !loading ? "pointer" : "not-allowed",
                    }}
                  >
                    {loading ? "Loading..." : "Next"}
                  </button>
                </div>
              )}
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
