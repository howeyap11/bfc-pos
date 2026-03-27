"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";

export default function StaffWasteReportsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/staff-ops/waste-reports`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("cloud_token") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => setRows(d.items ?? []))
      .catch(() => setRows([]));
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h1>Waste Reports</h1>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            {new Date(r.happenedAt).toLocaleString()} - {r.staffName} - {r.inventoryItemName} ({r.quantity} {r.unit ?? ""}) - {r.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
