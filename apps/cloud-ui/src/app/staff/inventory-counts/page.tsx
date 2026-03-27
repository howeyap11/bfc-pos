"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";

export default function StaffInventoryCountsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/staff-ops/inventory-counts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("cloud_token") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => setRows(d.items ?? []))
      .catch(() => setRows([]));
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h1>Inventory Count Sessions</h1>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            {new Date(r.countedAt).toLocaleString()} - {r.submittedByStaffName} - {r.source}
          </li>
        ))}
      </ul>
    </div>
  );
}
