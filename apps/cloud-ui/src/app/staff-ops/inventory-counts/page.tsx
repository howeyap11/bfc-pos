"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function InventoryCountsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    apiFetch("/admin/staff-ops/inventory-count-sessions").then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]));
  }, []);
  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold text-white">Inventory Counts</h1>
      <pre className="overflow-auto rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/90">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
