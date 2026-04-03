"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, api } from "@/lib/api";
import { getDefaultLocalDateString } from "@/lib/localDate";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import { SummaryCard } from "@/app/dashboard/SummaryCard";
import { WorkLogEntryDebugJson, WorkLogEntryDetail } from "./WorkLogEntryDetail";

type WorkLogEntry = {
  id: string;
  storeId: string;
  businessDate: string;
  actionType: string;
  actorName: string;
  actorStaffCloudId: string | null;
  occurredAt: string;
  summary: string;
  referenceType: string;
  referenceId: string;
  kind: string;
  detail: Record<string, unknown>;
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attendance", label: "Attendance" },
  { key: "inventory", label: "Inventory" },
  { key: "waste", label: "Waste" },
  { key: "sop", label: "SOP" },
  { key: "shifts", label: "Shifts" },
  { key: "violations", label: "Violations" },
  { key: "stock_movements", label: "Stock movements" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function imageSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function entryTitle(e: WorkLogEntry): string {
  const s = e.summary?.trim();
  if (s) return s;
  if (e.actionType?.trim()) return e.actionType.trim();
  return e.kind || "Event";
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

export default function WorkLogPage() {
  /** Resolved from server (work hours From + audit TZ); not calendar midnight in the browser. */
  const [businessDate, setBusinessDate] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selected, setSelected] = useState<WorkLogEntry | null>(null);
  const [summary, setSummary] = useState<{ beginningTotalAbsVariance: number; endTotalAbsVariance: number } | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [compareShift, setCompareShift] = useState<"Beginning" | "End">("Beginning");
  const [compareRows, setCompareRows] = useState<
    Awaited<ReturnType<typeof api.getWorkLogInventoryCompare>>["rows"]
  >([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [listQuery, setListQuery] = useState("");

  useEffect(() => {
    api
      .getWorkLogTodayBusinessDate()
      .then((r) => setBusinessDate(r.businessDate))
      .catch(() => setBusinessDate(getDefaultLocalDateString()));
  }, []);

  useEffect(() => {
    if (!businessDate) return;
    setEntriesLoading(true);
    const q = new URLSearchParams();
    q.set("filter", filter);
    q.set("businessDate", businessDate);
    apiFetch(`/admin/work-log?${q}`)
      .then((d: { entries?: WorkLogEntry[] }) => setEntries(Array.isArray(d.entries) ? d.entries : []))
      .catch(() => setEntries([]))
      .finally(() => setEntriesLoading(false));
  }, [filter, businessDate]);

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

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return sortedEntries;
    return sortedEntries.filter((e) => {
      const hay = [
        entryTitle(e),
        e.actorName,
        e.actionType,
        e.summary,
        e.kind,
        e.referenceType,
        e.referenceId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sortedEntries, listQuery]);

  return (
    <AdminPageLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2">
            <Link href="/staff-ops" className="text-sm font-medium text-teal-800/80 hover:text-teal-950">
              ← Staff operations
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-teal-950">Work log</h1>
          <p className="mt-1 max-w-2xl text-sm text-teal-900/70">
            Audit trail from synced store activity. Business day follows{" "}
            <span className="font-medium text-teal-900">Settings → Sales &amp; Inventory → Work hours (From)</span> and the
            dashboard audit timezone offset.
          </p>
        </div>
        <label className="flex shrink-0 flex-col gap-1.5 rounded-2xl border border-teal-100/80 bg-white p-3 shadow-sm ring-1 ring-black/5 sm:min-w-[200px]">
          <span className="text-xs font-semibold uppercase tracking-wide text-teal-800/60">Business date</span>
          <input
            type="date"
            value={businessDate ?? ""}
            onChange={(e) => setBusinessDate(e.target.value)}
            disabled={businessDate === null}
            className="rounded-lg border border-teal-200/80 bg-white px-3 py-2 text-sm text-teal-950 shadow-inner focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:opacity-60"
          />
          <span className="text-[11px] text-teal-800/55">
            Default = current staff business date (Settings → Work hours From + server audit TZ). Drives cards, comparison,
            and feed.
          </span>
        </label>
      </div>

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
        Σ|staff count − store stock in frozen <code className="rounded bg-white/80 px-1 py-0.5 text-teal-900">snapshotJson</code>{" "}
        (or expected line fallback) per Beginning / End session on this date.
      </p>

      <section className="mb-8 rounded-2xl border border-teal-100/80 bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-teal-950">Inventory count detail</h2>
            <p className="mt-0.5 text-sm text-teal-900/65">
              Date <span className="font-medium text-teal-950">{businessDate ?? "—"}</span> — counted vs system snapshot at
              submit
              (no cloud recomputation).
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
          <span className="font-medium text-teal-800/75">Store stock</span> is the frozen store quantity from the count
          submission (<code className="rounded bg-white/80 px-1">snapshotJson</code>). Movement columns are day-window totals
          for this business date. Warehouse columns use the WAREHOUSE location when configured; otherwise they show 0 / —.
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

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${filter === f.key ? chipActive : chipIdle}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-teal-800/60">Search activity</label>
        <input
          type="search"
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
          placeholder="Filter by title, staff, kind, reference…"
          className="mt-1.5 w-full max-w-md rounded-xl border border-teal-200/80 bg-white px-3 py-2 text-sm text-teal-950 shadow-inner placeholder:text-teal-800/40 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
        />
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-800/60">
        Activity · {businessDate ?? "…"}
        {entriesLoading
          ? " · loading…"
          : ` · ${filteredEntries.length} shown${listQuery.trim() ? ` of ${sortedEntries.length}` : ""}`}
      </h2>
      <ul className="space-y-2 pb-8">
        {filteredEntries.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => setSelected(e)}
              className="group flex w-full items-start gap-3 rounded-2xl border border-teal-100/80 bg-white px-4 py-3 text-left shadow-sm ring-1 ring-black/5 transition hover:border-teal-200 hover:bg-teal-50/30 hover:ring-teal-200/40"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-teal-950">{entryTitle(e)}</div>
                <div className="mt-1 flex flex-col gap-0.5 text-sm text-teal-900/70 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                  <span className="font-medium text-teal-900/85">{e.actorName || "—"}</span>
                  <span className="hidden text-teal-400 sm:inline" aria-hidden>
                    ·
                  </span>
                  <time className="tabular-nums text-teal-800/65" dateTime={e.occurredAt}>
                    {formatWhen(e.occurredAt)}
                  </time>
                </div>
                {e.actionType && e.summary?.trim() ? (
                  <div className="mt-1 text-xs text-teal-800/55">{e.actionType}</div>
                ) : null}
              </div>
              <span className="mt-1 shrink-0 text-teal-400 transition group-hover:text-teal-600" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!entriesLoading && sortedEntries.length === 0 && (
        <p className="pb-10 text-center text-sm text-teal-800/65">No entries for this filter and business date.</p>
      )}
      {!entriesLoading && sortedEntries.length > 0 && filteredEntries.length === 0 && (
        <p className="pb-10 text-center text-sm text-teal-800/65">No entries match your search.</p>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-teal-950/40 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal
          aria-label="Work log detail"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-teal-100/80 bg-white p-5 shadow-xl ring-1 ring-black/10"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-teal-200/80 bg-teal-50/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-800/80">
                    {selected.kind.replace(/_/g, " ")}
                  </span>
                  {selected.referenceType ? (
                    <span className="text-[11px] text-teal-800/50">
                      {selected.referenceType} · {selected.referenceId}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold text-teal-950">{entryTitle(selected)}</h3>
                <p className="mt-1 text-sm text-teal-900/75">
                  <span className="font-medium text-teal-950">{selected.actorName || "—"}</span>
                  <span className="text-teal-700/50"> · </span>
                  {formatWhen(selected.occurredAt)}
                </p>
                <p className="mt-1 text-xs text-teal-800/60">Business date {selected.businessDate}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-50"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            <WorkLogEntryDetail entry={{ kind: selected.kind, actionType: selected.actionType, detail: selected.detail }} />
            <WorkLogEntryDebugJson detail={selected.detail} />
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
