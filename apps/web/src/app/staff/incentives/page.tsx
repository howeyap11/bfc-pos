"use client";

import { useEffect, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";

type LedgerRow = {
  id?: string;
  amount?: string;
  reason?: string;
  happenedAt?: string;
  entryType?: string;
};

export default function StaffIncentivesPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);

  useEffect(() => {
    fetch("/api/staff/incentives/me", { headers: withStaffAuthHeaders(), cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-4 text-white sm:px-5 sm:pt-5">
      <p className="mb-6 text-base leading-relaxed text-white/55">
        Read-only from last synced incentive entries on this device.
      </p>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-black/25 px-4 py-8 text-center text-base text-white/45">
            No incentive entries yet.
          </p>
        ) : (
          rows.map((row, i) => {
            const key = row.id ?? `row-${i}`;
            const when = row.happenedAt
              ? new Date(row.happenedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";
            return (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xl font-semibold tabular-nums text-white">{row.amount ?? "—"}</span>
                  {when ? <span className="shrink-0 text-sm text-white/45">{when}</span> : null}
                </div>
                {row.reason ? <p className="mt-2 text-base text-white/70">{row.reason}</p> : null}
                {row.entryType ? (
                  <p className="mt-1 text-xs uppercase tracking-wide text-white/35">{row.entryType}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
