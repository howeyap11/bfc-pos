"use client";

import Link from "next/link";
import { COLORS } from "@/lib/theme";

export default function StaffOpsPage() {
  const operationsLinks = [
    { href: "/staff-ops/work-log", label: "Work Log (audit feed)", hint: "Unified stream: attendance, inventory, waste, SOP, shifts" },
    { href: "/staff-ops/attendance", label: "Attendance", hint: "Synced clock-ins from POS" },
    { href: "/staff-ops/waste-reports", label: "Waste Reports", hint: "" },
    { href: "/staff-ops/inventory-counts", label: "Inventory Counts", hint: "" },
    { href: "/staff-ops/sop-submissions", label: "SOP Submissions", hint: "" },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold text-white">Work Log</h1>
      <p className="mb-8 text-sm text-white/65">
        Cloud visibility for local-first store operations (staff audit + ops). Groups organize staff for SOP and schedule assignment by team.
      </p>

      <section className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/45">Team</h2>
        <p className="mb-3 text-sm text-white/55">Create groups and assign staff. POS login and PINs stay under Settings → Staff.</p>
        <Link
          href="/staff-ops/groups"
          className="block rounded-lg border px-4 py-3 transition-colors hover:bg-white/[0.07]"
          style={{ borderColor: COLORS.borderLight, background: COLORS.bgPanel }}
        >
          <span className="font-medium text-white">Groups & assignments</span>
          <span className="mt-0.5 block text-xs text-white/50">Manage operational groups and who belongs to each</span>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">Synced operations</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {operationsLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border px-4 py-3 text-white transition-colors hover:bg-white/[0.07]"
              style={{ borderColor: COLORS.borderLight, background: COLORS.bgPanel }}
            >
              <span className="font-medium">{l.label}</span>
              {l.hint ? <span className="mt-0.5 block text-xs text-white/45">{l.hint}</span> : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
