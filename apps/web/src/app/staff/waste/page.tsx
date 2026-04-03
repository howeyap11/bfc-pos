"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";

type Ing = { cloudId: string; name: string; unitCode: string; imageUrl?: string | null };

const REASONS = ["Spoilage", "Damage", "Expired", "Overproduction", "Customer return", "Other"];

function IngThumb({ ing, size = "md" }: { ing: Ing | null; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-16 w-16" : "h-12 w-12";
  const src = ing?.imageUrl?.trim();
  if (src) {
    return (
      <div className={`${dim} shrink-0 overflow-hidden rounded-2xl bg-zinc-800 ring-2 ring-white/10`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-xl ring-2 ring-white/10`}
      aria-hidden
    >
      📦
    </div>
  );
}

export default function StaffWastePage() {
  const [ings, setIngs] = useState<Ing[]>([]);
  const [q, setQ] = useState("");
  const [cloudId, setCloudId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/staff/inventory/ingredients", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setIngs(d) : setIngs([])))
      .catch(() => setIngs([]));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ings;
    return ings.filter((i) => i.name.toLowerCase().includes(s));
  }, [ings, q]);

  const selected = useMemo(() => ings.find((i) => i.cloudId === cloudId) ?? null, [ings, cloudId]);

  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function submit() {
    setMsg("");
    if (!cloudId) {
      setMsg("Choose an inventory item.");
      return;
    }
    if (!imageBase64) {
      setMsg("Photo is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/staff/waste-reports", {
        method: "POST",
        headers: withStaffAuthHeaders(),
        body: JSON.stringify({
          itemType: "INVENTORY_ITEM",
          inventoryItemCloudId: cloudId,
          quantity,
          reason,
          notes: notes || undefined,
          imageBase64,
        }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      setMsg("Saved locally; will sync when online.");
      setQuantity("");
      setNotes("");
      setImageBase64("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-4 text-white sm:px-5 sm:pt-5">
      <section className="mb-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-white/50">
            Search ingredient
          </label>
          <input
            className="w-full rounded-2xl border border-white/15 bg-zinc-900/80 px-5 py-4 text-lg text-white placeholder:text-white/35"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to filter…"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-white/50">Item</label>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/12 bg-black/30 p-2">
            {filtered.map((i) => (
              <button
                key={i.cloudId}
                type="button"
                onClick={() => setCloudId(i.cloudId)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  cloudId === i.cloudId ? "bg-white/12" : "hover:bg-white/6"
                }`}
              >
                <IngThumb ing={i} size="sm" />
                <span className="min-w-0 flex-1 text-base font-medium text-white">{i.name}</span>
                <span className="shrink-0 text-sm text-white/45">{i.unitCode}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-center text-sm text-white/45">No matches.</p>}
          </div>
        </div>
        {selected && (
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3">
            <IngThumb ing={selected} />
            <div className="min-w-0">
              <p className="font-semibold text-white">Selected</p>
              <p className="text-sm text-white/60">
                {selected.name} · {selected.unitCode}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-white/12 bg-black/25 p-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/55">Quantity</label>
          <input
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-4 text-lg text-white"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/55">Reason</label>
          <select
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-4 text-lg text-white"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r} value={r} className="bg-zinc-900">
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/55">Notes (optional)</label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-white/35"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional details…"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/55">Photo (required)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setImageBase64(await toBase64(f));
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/25 bg-zinc-900/50 px-4 py-6 text-center transition-colors hover:border-white/35 hover:bg-zinc-900/70"
          >
            <span className="text-2xl" aria-hidden>
              📷
            </span>
            <span className="text-base font-medium text-white/90">Tap to add photo</span>
            <span className="text-sm text-white/45">Required for waste report</span>
          </button>
          {imageBase64 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageBase64} alt="" className="max-h-56 w-full object-cover" />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="w-full rounded-2xl bg-amber-500 py-5 text-lg font-semibold text-zinc-950 shadow-lg shadow-amber-900/20 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Submit waste report"}
        </button>
        {msg && <p className="text-center text-base text-emerald-400">{msg}</p>}
      </section>
    </main>
  );
}
