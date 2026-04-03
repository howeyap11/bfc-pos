"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AdminPageLayout } from "@/components/AdminPageLayout";

export default function SopSubmissionsPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  useEffect(() => {
    apiFetch("/admin/staff-ops/sop-submissions")
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, []);
  return (
    <AdminPageLayout maxWidthClassName="max-w-4xl">
      <Link href="/staff-ops" className="mb-4 inline-block text-sm font-medium text-teal-800/80 hover:text-teal-950">
        ← Staff operations
      </Link>
      <h1 className="mb-3 text-xl font-semibold text-teal-950">SOP Submissions</h1>
      <pre className="overflow-auto rounded-2xl border border-teal-100/80 bg-white p-4 text-xs text-teal-950 shadow-sm ring-1 ring-black/5">
        {JSON.stringify(rows, null, 2)}
      </pre>
    </AdminPageLayout>
  );
}
