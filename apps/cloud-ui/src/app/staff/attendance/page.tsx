"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";

type Row = {
  id: string;
  staffName: string;
  eventType: string;
  happenedAt: string;
  selfieUploadedUrl?: string | null;
  selfieDeletedAt?: string | null;
};

export default function StaffAttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`${API}/admin/staff-ops/attendance`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("cloud_token") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => setRows(d.items ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Staff Attendance</h1>
      <table style={{ width: "100%", marginTop: 12 }}>
        <thead><tr><th>When</th><th>Staff</th><th>Type</th><th>Selfie</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.happenedAt).toLocaleString()}</td>
              <td>{r.staffName}</td>
              <td>{r.eventType}</td>
              <td>{r.selfieDeletedAt ? "Expired" : r.selfieUploadedUrl ? "Available" : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
