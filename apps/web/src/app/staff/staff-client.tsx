"use client";

import { useEffect, useState } from "react";

type QueueOrder = {
  id: string;
  orderNo: number;
  status: string;
  createdAt: string;
  table: { label: string; zone: { code: string } };
  items: Array<{
    id: string;
    qty: number;
    lineNote: string | null;
    item: { name: string; category: { prepArea: "BAR" | "KITCHEN" } };
    options: Array<{ id: string; option: { name: string; group: { name: string } } }>;
  }>;
};

export default function StaffClient() {
  const [area, setArea] = useState<"BAR" | "KITCHEN">("BAR");
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/queue?area=${area}`, { cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    setOrders(JSON.parse(text) as QueueOrder[]);
  }

  useEffect(() => {
    load().catch(console.error);
    const t = setInterval(() => load().catch(console.error), 2000);
    return () => clearInterval(t);
  }, [area]);

  async function setStatus(orderId: string, status: string) {
    setBusyId(orderId);
    try {
      await fetch(`/api/order-status/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Staff Queue</h1>

      <p style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setArea("BAR")} disabled={area === "BAR"}>Bar</button>
        <button onClick={() => setArea("KITCHEN")} disabled={area === "KITCHEN"}>Kitchen</button>
      </p>

      {orders.length === 0 ? (
        <p>No orders.</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <b>#{o.orderNo}</b> — {o.table.zone.code}-{o.table.label}
              </div>
              <div><b>{o.status}</b></div>
            </div>

            <ul>
              {o.items.map((li) => (
                <li key={li.id} style={{ marginTop: 8 }}>
                  <b>{li.qty}× {li.item.name}</b>
                  {li.options.length > 0 && (
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      {li.options.map((x) => (
                        <div key={x.id}>• {x.option.group.name}: {x.option.name}</div>
                      ))}
                    </div>
                  )}
                  {li.lineNote && <div style={{ fontStyle: "italic" }}>Note: {li.lineNote}</div>}
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button disabled={busyId === o.id} onClick={() => setStatus(o.id, "ACCEPTED")}>Accept</button>
              <button disabled={busyId === o.id} onClick={() => setStatus(o.id, "IN_PREP")}>In Prep</button>
              <button disabled={busyId === o.id} onClick={() => setStatus(o.id, "READY")}>Ready</button>
              <button disabled={busyId === o.id} onClick={() => setStatus(o.id, "COMPLETED")}>Complete</button>
              <button disabled={busyId === o.id} onClick={() => setStatus(o.id, "CANCELLED")}>Cancel</button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
