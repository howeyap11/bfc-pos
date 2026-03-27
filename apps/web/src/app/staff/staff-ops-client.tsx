"use client";

import { useMemo, useState } from "react";
import { getActiveStaff } from "../pos/staff/staff-login-client";

function headersWithStaffKey(): HeadersInit {
  const active = getActiveStaff();
  return {
    "content-type": "application/json",
    ...(active?.staffKey ? { "x-staff-key": active.staffKey } : {}),
  };
}

export default function StaffOpsClient() {
  const active = useMemo(() => getActiveStaff(), []);
  const [status, setStatus] = useState<string>("");

  async function call(path: string, body?: Record<string, unknown>) {
    setStatus("Submitting...");
    const res = await fetch(`/api/staff-ops${path}`, {
      method: body ? "POST" : "GET",
      headers: headersWithStaffKey(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    setStatus(res.ok ? "Success" : `Failed: ${text.slice(0, 160)}`);
  }

  if (!active) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Staff Operations</h1>
        <p>Login first in POS staff screen.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Staff Operations</h1>
      <p style={{ marginBottom: 20 }}>{active.name} ({active.role})</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button style={{ padding: 18, fontSize: 20 }} onClick={() => call("/staff/attendance/time-in", {})}>Time In</button>
        <button style={{ padding: 18, fontSize: 20 }} onClick={() => call("/staff/attendance/time-out", {})}>Time Out</button>
        <button style={{ padding: 18, fontSize: 20 }} onClick={() => call("/staff/waste-reports", { itemType: "OTHER", inventoryItemName: "Sample", quantity: "1", reason: "Demo" })}>Waste Report</button>
        <button style={{ padding: 18, fontSize: 20 }} onClick={() => call("/staff/inventory-count-sessions", { source: "STAFF_UI", lines: [{ inventoryItemCloudId: "demo", inventoryItemName: "Sample", actualQuantity: "0" }] })}>Inventory Count</button>
        <button style={{ padding: 18, fontSize: 20 }} onClick={() => call("/staff/sop/submissions", { templateName: "Opening", templateVersion: 1, shiftType: "OPENING", checklistResult: [{ item: "Checklist", checked: true }] })}>SOP Submit</button>
        <button style={{ padding: 18, fontSize: 20 }} onClick={() => call("/staff/incentives/me")}>My Incentives</button>
      </div>
      <p style={{ marginTop: 18 }}>{status}</p>
    </div>
  );
}
