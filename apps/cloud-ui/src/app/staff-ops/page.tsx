"use client";

import Link from "next/link";
import { AdminPageLayout } from "@/components/AdminPageLayout";

export default function StaffOpsPage() {
  const operationsLinks = [
    {
      href: "/staff-ops/work-log",
      label: "Work log",
      hint: "Audit feed, inventory variance, and count comparison for a business day",
    },
    { href: "/staff-ops/attendance", label: "Attendance", hint: "Synced clock-ins from POS" },
    { href: "/staff-ops/waste-reports", label: "Waste Reports", hint: "" },
    { href: "/staff-ops/inventory-counts", label: "Inventory Counts", hint: "" },
    { href: "/staff-ops/sop-submissions", label: "SOP Submissions", hint: "" },
  ];

  return (
    <AdminPageLayout maxWidthClassName="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold text-teal-950">Staff operations</h1>
      <p className="mb-8 text-sm text-teal-900/70">
        Cloud visibility for local-first store operations. Staff PINs and roles stay under Settings → Staff.
      </p>

      <section className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800/60">Team</h2>
        <p className="mb-3 text-sm text-teal-900/65">Create groups and assign staff for SOP and scheduling.</p>
        <Link
          href="/staff-ops/groups"
          className="block rounded-2xl border border-teal-100/80 bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-teal-200/80"
        >
          <span className="font-medium text-teal-950">Groups & assignments</span>
          <span className="mt-0.5 block text-xs text-teal-800/60">Manage operational groups and membership</span>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-800/60">Synced operations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {operationsLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl border border-teal-100/80 bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-teal-200/80"
            >
              <span className="font-medium text-teal-950">{l.label}</span>
              {l.hint ? <span className="mt-0.5 block text-xs text-teal-800/60">{l.hint}</span> : null}
            </Link>
          ))}
        </div>
      </section>
    </AdminPageLayout>
  );
}
