"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getDefaultLocalDateString } from "@/lib/localDate";
import { SummaryCard } from "@/app/dashboard/SummaryCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function imageSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function varianceClass(v: number): string {
  return Math.abs(v) > 1e-6 ? "font-medium text-red-600" : "tabular-nums text-gray-500";
}

function addedClass(n: number): string {
  return n > 0 ? "tabular-nums text-emerald-700" : "tabular-nums text-gray-400";
}

function wasteOrPullClass(n: number): string {
  return n > 0 ? "tabular-nums text-red-600" : "tabular-nums text-gray-400";
}

const chipActive =
  "border-teal-600 bg-teal-600 text-white shadow-sm ring-1 ring-teal-700/20";
const chipIdle =
  "border-teal-200/80 bg-white text-teal-900 shadow-sm ring-1 ring-black/5 hover:bg-teal-50/80";

/**
 * Manual inventory variance cards + per-ingredient compare (shift/session vs frozen snapshot).
 * Lives on the Inventory page; uses the same ordering as cloud Ingredient.sortOrder (API).
 */
export function InventoryManualCountReporting() {
  const [businessDate, setBusinessDate] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ beginningTotalAbsVariance: number; endTotalAbsVariance: number } | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [compareShift, setCompareShift] = useState<"Beginning" | "End">("Beginning");
  const [compareRows, setCompareRows] = useState<
    Awaited<ReturnType<typeof api.getWorkLogInventoryCompare>>["rows"]
  >([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    api
      .getWorkLogTodayBusinessDate()
      .then((r) => setBusinessDate(r.businessDate))
      .catch(() => setBusinessDate(getDefaultLocalDateString()));
  }, []);

  useEffect(() => {
    if (!businessDate) {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    api
      .getWorkLogInventorySummary({ businessDate })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [businessDate]);

  useEffect(() => {
    if (!businessDate) {
      setCompareRows([]);
      setCompareLoading(false);
      return;
    }
    setCompareLoading(true);
    api
      .getWorkLogInventoryCompare({ businessDate, shiftType: compareShift })
      .then((d) => setCompareRows(d.rows))
      .catch(() => setCompareRows([]))
      .finally(() => setCompareLoading(false));
  }, [businessDate, compareShift]);

  const rowsWithBreakdown = useMemo(
    () =>
      compareRows.some(
        (r) => r.openedAmount != null || r.sealedUnitCount != null || r.sealedBoxCount != null
      ),
    [compareRows]
  );

  return (
    <section className="mb-10 rounded-2xl border border-teal-100/80 bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="text-lg font-semibold text-teal-950">Manual inventory counts</h2>
      <p className="mt-1 text-sm text-teal-900/65">
        Variance and count detail use frozen POS <code className="rounded bg-teal-50 px-1 text-teal-900">snapshotJson</code>{" "}
        (no cloud recompute). Ingredient order matches <span className="font-medium">Ingredients</span> list{" "}
        <span className="font-medium text-teal-800">sortOrder</span>.
      </p>

      <label className="mb-6 mt-4 flex max-w-xs flex-col gap-1.5 rounded-2xl border border-teal-100/80 bg-teal-50/30 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-800/60">Business date</span>
        <input
          type="date"
          value={businessDate ?? ""}
          onChange={(e) => setBusinessDate(e.target.value)}
          disabled={businessDate === null}
          className="rounded-lg border border-teal-200/80 bg-white px-3 py-2 text-sm text-teal-950 shadow-inner focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:opacity-60"
        />
      </label>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <SummaryCard
          title="Beginning inventory variance"
          value={summary != null ? formatQty(summary.beginningTotalAbsVariance) : "—"}
          gradient="orange"
          loading={summaryLoading}
        />
        <SummaryCard
          title="End inventory variance"
          value={summary != null ? formatQty(summary.endTotalAbsVariance) : "—"}
          gradient="green"
          loading={summaryLoading}
        />
      </div>
      <p className="-mt-2 mb-6 text-xs text-teal-800/60">
        Σ|staff count − store stock in frozen snapshot per Beginning / End session on this date.
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-teal-950">Count detail</h3>
          <p className="mt-0.5 text-sm text-teal-900/65">
            Date <span className="font-medium text-teal-950">{businessDate ?? "—"}</span> — staff vs system at submit.
          </p>
        </div>
        <div className="flex gap-2">
          {(["Beginning", "End"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCompareShift(s)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${compareShift === s ? chipActive : chipIdle}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-teal-800/60">
        Store stock is the frozen quantity from the count submission. Movement columns are day-window ledger totals.
      </p>
      {compareLoading ? (
        <p className="text-sm text-teal-800/70">Loading comparison…</p>
      ) : compareRows.length === 0 ? (
        <p className="text-sm text-teal-800/70">No manual inventory session for this shift and date.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-teal-100/60">
          <table className="min-w-full divide-y divide-teal-100/80 text-sm">
            <thead className="bg-teal-50/80">
              <tr>
                <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Image
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Ingredient
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Category
                </th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Unit
                </th>
                {rowsWithBreakdown ? (
                  <>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                      opened
                    </th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                      sealed U
                    </th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                      sealed B
                    </th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                      total
                    </th>
                  </>
                ) : null}
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Staff count
                </th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Store stock
                </th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase text-red-700/90">Variance</th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase text-emerald-800/90">Store added</th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase text-red-700/90">Waste</th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Warehouse stock
                </th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase text-emerald-800/90">
                  Warehouse added
                </th>
                <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase text-red-700/90">Pulled out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50 bg-white">
              {compareRows.map((r) => (
                <tr key={r.ingredientId} className="hover:bg-teal-50/40">
                  <td className="px-2 py-2">
                    {imageSrc(r.imageUrl) ? (
                      <img src={imageSrc(r.imageUrl)!} alt="" className="h-9 w-9 rounded-lg border border-teal-100 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-teal-200/80 text-xs text-teal-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 font-medium text-teal-950">{r.ingredientName}</td>
                  <td className="px-2 py-2 text-teal-900/70">{r.categoryName ?? "—"}</td>
                  <td className="px-2 py-2 text-right text-teal-900/70">{r.unitCode}</td>
                  {rowsWithBreakdown ? (
                    <>
                      <td className="px-2 py-2 text-right tabular-nums text-teal-900/80">
                        {r.openedAmount != null ? formatQty(r.openedAmount) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-teal-900/80">
                        {r.sealedUnitCount != null ? formatQty(r.sealedUnitCount) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-teal-900/80">
                        {r.sealedBoxCount != null ? formatQty(r.sealedBoxCount) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-teal-950">
                        {r.totalAmount != null ? formatQty(r.totalAmount) : "—"}
                      </td>
                    </>
                  ) : null}
                  <td className="px-2 py-2 text-right tabular-nums text-teal-950">{formatQty(r.staffCount)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-teal-900/80">{formatQty(r.systemStoreStockAtSubmit)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${varianceClass(r.variance)}`}>{formatQty(r.variance)}</td>
                  <td className={`px-2 py-2 text-right ${addedClass(r.storeAdded)}`}>{formatQty(r.storeAdded)}</td>
                  <td className={`px-2 py-2 text-right ${wasteOrPullClass(r.waste)}`}>{formatQty(r.waste)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-teal-950">{formatQty(r.warehouseStockCurrent)}</td>
                  <td className={`px-2 py-2 text-right ${addedClass(r.warehouseAdded)}`}>{formatQty(r.warehouseAdded)}</td>
                  <td className={`px-2 py-2 text-right ${wasteOrPullClass(r.pulledOut)}`}>{formatQty(r.pulledOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
