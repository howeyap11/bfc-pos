"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, apiFetch } from "@/lib/api";
import { getDefaultLocalDateString } from "@/lib/localDate";
import { AdminPageLayout } from "@/components/AdminPageLayout";
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

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function entryTitle(e: WorkLogEntry): string {
  const s = e.summary?.trim();
  if (s) return s;
  if (e.actionType?.trim()) return e.actionType.trim();
  return e.kind || "Event";
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
            Activity feed from synced store operations. For Beginning/End variance and count comparison, open{" "}
            <span className="font-medium text-teal-950">Inventory</span>. Business day follows{" "}
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
            Default = current staff business date (Settings → Work hours From + server audit TZ). Drives this feed.
          </span>
        </label>
      </div>

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
