"use client";

import Link from "next/link";

export default function StaffOpsPage() {
  const links = [
    { href: "/staff-ops/attendance", label: "Attendance" },
    { href: "/staff-ops/waste-reports", label: "Waste Reports" },
    { href: "/staff-ops/inventory-counts", label: "Inventory Counts" },
    { href: "/staff-ops/sop-submissions", label: "SOP Submissions" },
  ];
  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold text-white">Staff Operations</h1>
      <p className="mb-6 text-sm text-white/70">Cloud visibility for local-first staff operations synced from store devices.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
