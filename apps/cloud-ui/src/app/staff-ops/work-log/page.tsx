"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { COLORS } from "@/lib/theme";

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
];

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function WorkLogPage() {
  const [filter, setFilter] = useState("all");
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [selected, setSelected] = useState<WorkLogEntry | null>(null);

  useEffect(() => {
    apiFetch(`/admin/work-log?filter=${encodeURIComponent(filter)}`)
      .then((d: { entries?: WorkLogEntry[] }) => setEntries(Array.isArray(d.entries) ? d.entries : []))
      .catch(() => setEntries([]));
  }, [filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkLogEntry[]>();
    for (const e of entries) {
      const k = e.businessDate;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  return (
    <div className="max-w-3xl pb-24">
      <h1 className="mb-1 text-2xl font-semibold text-white">Work Log</h1>
      <p className="mb-4 text-sm text-white/60">
        Audit stream from synced store activity. Business day uses a 4:00 AM cutover in the configured audit timezone (default +8).
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: filter === f.key ? COLORS.borderLight : "rgba(255,255,255,0.12)",
              background: filter === f.key ? "rgba(255,255,255,0.12)" : COLORS.bgPanel,
              color: filter === f.key ? "#fff" : "rgba(255,255,255,0.75)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {grouped.map(([dateKey, rows]) => (
          <section key={dateKey}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">Business date {dateKey}</h2>
            <ul className="space-y-2">
              {rows.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                    style={{ borderColor: COLORS.borderLight, background: COLORS.bgPanel }}
                  >
                    <div className="font-medium text-white">{e.actionType}</div>
                    <div className="mt-1 text-sm text-white/55">
                      {e.actorName} · {formatWhen(e.occurredAt)}
                    </div>
                    {e.summary ? <div className="mt-0.5 text-xs text-white/40">{e.summary}</div> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="mt-8 text-center text-sm text-white/45">No entries for this filter.</p>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-label="Work log detail"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border p-4 shadow-xl"
            style={{ borderColor: COLORS.borderLight, background: "#1a1a1a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white">{selected.actionType}</h3>
                <p className="text-sm text-white/55">
                  {selected.actorName} · {formatWhen(selected.occurredAt)}
                </p>
                <p className="text-xs text-white/40">Business date {selected.businessDate}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-white/20 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 text-xs text-white/80">
              {JSON.stringify(selected.detail, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
