"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getActiveStaff, withStaffAuthHeaders } from "@/lib/staffAuth";
import { canAddStockToStoreOrWarehouse, canRecordWarehousePullout } from "@/lib/staffInventoryCapabilities";

type Ing = { cloudId: string; name: string; unitCode: string };

const KINDS = [
  { value: "STORE_ADD", label: "Add to store (café)" },
  { value: "WAREHOUSE_ADD", label: "Add to warehouse" },
  { value: "WAREHOUSE_PULLOUT", label: "Pull out (warehouse → store)" },
] as const;

type MovementKind = (typeof KINDS)[number]["value"];

export default function StaffStockMovementsPage() {
  const [ings, setIngs] = useState<Ing[]>([]);
  const [cloudId, setCloudId] = useState("");
  const [kind, setKind] = useState<MovementKind>("WAREHOUSE_PULLOUT");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);

  useEffect(() => {
    setStaffRole(getActiveStaff()?.role ?? null);
  }, []);

  const canAdd = canAddStockToStoreOrWarehouse(staffRole);
  const canPull = canRecordWarehousePullout(staffRole);

  const kindOptions = useMemo(() => {
    const out: { value: MovementKind; label: string }[] = [];
    if (canAdd) {
      out.push({ value: "STORE_ADD", label: "Add to store (café)" });
      out.push({ value: "WAREHOUSE_ADD", label: "Add to warehouse" });
    }
    if (canPull) out.push({ value: "WAREHOUSE_PULLOUT", label: "Pull out (warehouse → store)" });
    return out;
  }, [canAdd, canPull]);

  useEffect(() => {
    if (kindOptions.length === 0) return;
    if (!kindOptions.some((k) => k.value === kind)) {
      setKind(kindOptions[0].value);
    }
  }, [kindOptions, kind]);

  useEffect(() => {
    fetch("/api/staff/inventory/ingredients", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setIngs(d) : setIngs([])))
      .catch(() => setIngs([]));
  }, []);

  const selected = useMemo(() => ings.find((i) => i.cloudId === cloudId) ?? null, [ings, cloudId]);

  async function submit() {
    setMsg("");
    if (!canPull && kind === "WAREHOUSE_PULLOUT") {
      setMsg("Your role cannot record pullouts.");
      return;
    }
    if (!canAdd && (kind === "STORE_ADD" || kind === "WAREHOUSE_ADD")) {
      setMsg("Manager or auditor required for stock adds.");
      return;
    }
    if (!cloudId) {
      setMsg("Select an ingredient.");
      return;
    }
    const q = quantity.trim();
    if (!q || Number(q) <= 0) {
      setMsg("Enter a positive quantity.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/staff/inventory/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...withStaffAuthHeaders() },
        body: JSON.stringify({
          kind,
          ingredientCloudId: cloudId,
          quantity: q,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof data.message === "string" ? data.message : data.error ?? "Request failed");
        return;
      }
      setMsg("Recorded and queued for cloud sync.");
      setQuantity("");
      setNotes("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-white">
      <Link href="/staff" className="mb-4 inline-block text-sm text-teal-400 hover:underline">
        ← Staff home
      </Link>
      <h1 className="mb-2 text-xl font-semibold">Stock movements</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Local-first: updates POS inventory immediately, then queues cloud sync.{" "}
        {canAdd ? "Managers/auditors can add to store or warehouse. " : ""}
        {canPull ? "Authorized roles can pull stock from warehouse to the café." : ""}
        {!canAdd && !canPull ? "No stock actions are available for your role." : ""}
      </p>
      {kindOptions.length === 0 ? (
        <p className="text-sm text-amber-300">You do not have permission for any stock movements.</p>
      ) : null}
      {msg && (
        <p className={`mb-4 text-sm ${msg.includes("Recorded") ? "text-green-400" : "text-amber-300"}`}>{msg}</p>
      )}
      {kindOptions.length > 0 ? (
        <>
          <label className="mb-1 block text-xs text-zinc-400">Movement</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MovementKind)}
            className="mb-4 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
          >
            {kindOptions.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <label className="mb-1 block text-xs text-zinc-400">Ingredient</label>
      <select
        value={cloudId}
        onChange={(e) => setCloudId(e.target.value)}
        className="mb-4 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
      >
        <option value="">— Select —</option>
        {ings.map((i) => (
          <option key={i.cloudId} value={i.cloudId}>
            {i.name} ({i.unitCode})
          </option>
        ))}
      </select>
      {selected && (
        <p className="mb-4 text-xs text-zinc-500">
          Unit: <span className="text-zinc-300">{selected.unitCode}</span>
        </p>
      )}
      <label className="mb-1 block text-xs text-zinc-400">Quantity (base unit)</label>
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        inputMode="decimal"
        className="mb-4 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
        placeholder="e.g. 1.5"
      />
      <label className="mb-1 block text-xs text-zinc-400">Notes (optional)</label>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mb-6 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || kindOptions.length === 0}
        className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Submit"}
      </button>
    </div>
  );
}
