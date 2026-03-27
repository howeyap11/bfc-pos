"use client";

import { useMemo, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";

type InventoryCountFormProps = {
  compact?: boolean;
  source?: "STAFF_UI" | "POS";
};

type CountLine = {
  inventoryItemCloudId: string;
  inventoryItemName: string;
  actualQuantity: string;
  unit?: string;
  notes?: string;
};

export function InventoryCountForm({ compact = false, source = "STAFF_UI" }: InventoryCountFormProps) {
  const [lines, setLines] = useState<CountLine[]>([
    { inventoryItemCloudId: "", inventoryItemName: "", actualQuantity: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const validLines = useMemo(
    () => lines.filter((l) => l.inventoryItemCloudId.trim() && l.inventoryItemName.trim() && l.actualQuantity.trim()),
    [lines]
  );

  function updateLine(index: number, patch: Partial<CountLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { inventoryItemCloudId: "", inventoryItemName: "", actualQuantity: "" }]);
  }

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/staffops/staff/inventory-count-sessions", {
        method: "POST",
        headers: withStaffAuthHeaders(),
        body: JSON.stringify({
          source,
          notes: notes || undefined,
          lines: validLines,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      setMsg("Inventory count saved locally and queued for sync.");
      setLines([{ inventoryItemCloudId: "", inventoryItemName: "", actualQuantity: "" }]);
      setNotes("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Manual Inventory Count</h3>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-4"}`}>
            <input
              placeholder="Inventory item cloud ID"
              value={l.inventoryItemCloudId}
              onChange={(e) => updateLine(i, { inventoryItemCloudId: e.target.value })}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
            <input
              placeholder="Item name"
              value={l.inventoryItemName}
              onChange={(e) => updateLine(i, { inventoryItemName: e.target.value })}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
            <input
              placeholder="Actual quantity"
              value={l.actualQuantity}
              onChange={(e) => updateLine(i, { actualQuantity: e.target.value })}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
            <input
              placeholder="Unit (optional)"
              value={l.unit ?? ""}
              onChange={(e) => updateLine(i, { unit: e.target.value })}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={addLine} className="rounded-md bg-white/10 px-3 py-2 text-sm text-white">
          Add line
        </button>
      </div>
      <textarea
        placeholder="Session notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-3 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || validLines.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Submit count"}
        </button>
        {msg && <span className="text-sm text-white/80">{msg}</span>}
      </div>
    </div>
  );
}
