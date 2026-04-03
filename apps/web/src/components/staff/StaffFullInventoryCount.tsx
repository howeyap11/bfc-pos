"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";

type Ing = { cloudId: string; name: string; unitCode: string; imageUrl?: string | null };

type DraftPayload = {
  v: 2 | 3;
  quantities: Record<string, string>;
  notes?: string;
};

const DRAFT_VERSION = 3 as const;

function IngredientThumb({ ing, variant = "row" }: { ing: Ing; variant?: "row" | "guided" }) {
  const src = ing.imageUrl?.trim();
  const isGuided = variant === "guided";
  const wrap = isGuided
    ? "mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 ring-2 ring-zinc-600"
    : "h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10";
  if (src) {
    return (
      <div className={wrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (isGuided) {
    return (
      <div
        className="mx-auto flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-4xl ring-2 ring-zinc-600"
        aria-hidden
      >
        📦
      </div>
    );
  }
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg ring-2 ring-white/10"
      aria-hidden
    >
      📦
    </div>
  );
}

export function StaffFullInventoryCount({ draftStorageKey }: { draftStorageKey: string }) {
  const [ingredients, setIngredients] = useState<Ing[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedQtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/staff/inventory/ingredients", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setIngredients(d) : setIngredients([])))
      .catch(() => setIngredients([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftPayload | { lines?: unknown };
        if (
          "v" in parsed &&
          (parsed.v === 2 || parsed.v === 3) &&
          parsed.quantities &&
          typeof parsed.quantities === "object"
        ) {
          setQuantities(parsed.quantities);
        }
      }
    } catch {
      /* ignore */
    }
    setDraftLoaded(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !draftLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const payload: DraftPayload = { v: DRAFT_VERSION, quantities };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      } catch {
        /* quota */
      }
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draftStorageKey, draftLoaded, quantities]);

  useEffect(() => {
    if (!guidedMode || ingredients.length === 0) return;
    setCurrentIndex((i) => Math.min(Math.max(0, i), ingredients.length - 1));
  }, [guidedMode, ingredients.length]);

  useEffect(() => {
    if (guidedMode && ingredients.length === 0) setGuidedMode(false);
  }, [guidedMode, ingredients.length]);

  useEffect(() => {
    if (!guidedMode) return;
    const t = window.setTimeout(() => guidedQtyInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [guidedMode, currentIndex]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(s));
  }, [ingredients, search]);

  const linesForSubmit = useMemo(() => {
    return ingredients
      .map((ing) => {
        const q = (quantities[ing.cloudId] ?? "").trim();
        if (!q) return null;
        return {
          inventoryItemCloudId: ing.cloudId,
          inventoryItemName: ing.name,
          actualQuantity: q,
          unit: ing.unitCode,
        };
      })
      .filter(Boolean) as Array<{
      inventoryItemCloudId: string;
      inventoryItemName: string;
      actualQuantity: string;
      unit: string;
    }>;
  }, [ingredients, quantities]);

  async function submit() {
    if (linesForSubmit.length === 0) {
      setMsg("Enter at least one quantity.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/staff/inventory-count-sessions", {
        method: "POST",
        headers: withStaffAuthHeaders(),
        body: JSON.stringify({
          source: "STAFF_UI",
          lines: linesForSubmit,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      setMsg("Saved locally and queued for sync.");
      setQuantities({});
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function setQty(cloudId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [cloudId]: value }));
  }

  const currentIng = ingredients[currentIndex];
  const totalItems = ingredients.length;
  const canPrev = guidedMode && currentIndex > 0;
  const canNext = guidedMode && currentIndex < totalItems - 1;

  const navBtnClass =
    "min-h-[52px] flex-1 rounded-xl border border-zinc-600 bg-zinc-800 px-4 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/45">Draft autosaves per line. Cleared after successful submit.</p>

      {!guidedMode && (
        <button
          type="button"
          disabled={ingredients.length === 0}
          onClick={() => {
            setCurrentIndex(0);
            setGuidedMode(true);
          }}
          className="w-full min-h-[52px] rounded-xl border border-emerald-500/40 bg-emerald-600/25 py-4 text-lg font-semibold text-emerald-100 shadow-md transition-colors hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Guided Count
        </button>
      )}

      {guidedMode && currentIng && (
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Guided Inventory Count</h2>
            <p className="mt-2 text-base tabular-nums text-white/50">
              {currentIndex + 1} of {totalItems}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-lg">
            <IngredientThumb ing={currentIng} variant="guided" />
            <h3 className="mt-5 text-center text-xl font-semibold leading-snug text-white sm:text-2xl">{currentIng.name}</h3>
            <p className="mt-2 text-center text-base text-white/50">{currentIng.unitCode}</p>
            <label className="mt-6 block">
              <span className="sr-only">Quantity for {currentIng.name}</span>
              <input
                ref={guidedQtyInputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={quantities[currentIng.cloudId] ?? ""}
                onChange={(e) => setQty(currentIng.cloudId, e.target.value)}
                className="w-full rounded-2xl border border-zinc-600 bg-black/30 px-4 py-5 text-center text-3xl font-bold tabular-nums text-white placeholder:text-white/25"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" disabled={!canPrev} className={navBtnClass} onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}>
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext}
              className={navBtnClass}
              onClick={() => setCurrentIndex((i) => Math.min(totalItems - 1, i + 1))}
            >
              Next
            </button>
          </div>

          <button
            type="button"
            className="w-full min-h-[48px] rounded-xl border border-zinc-600 bg-zinc-800/80 py-3 text-base font-medium text-white/90 hover:bg-zinc-700"
            onClick={() => setGuidedMode(false)}
          >
            Back to Full List
          </button>
        </div>
      )}

      {!guidedMode && (
        <>
          <input
            type="search"
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-zinc-900/80 px-5 py-4 text-lg text-white shadow-inner placeholder:text-white/35"
          />
          <div className="max-h-[min(58vh,28rem)] space-y-2 overflow-y-auto rounded-2xl border border-white/12 bg-black/25 p-3 sm:p-4">
            {filtered.map((ing) => (
              <div
                key={ing.cloudId}
                className="flex items-center gap-3 border-b border-white/10 py-4 last:border-0 sm:gap-4"
              >
                <IngredientThumb ing={ing} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-snug text-white">{ing.name}</p>
                  <p className="mt-0.5 text-sm text-white/45">{ing.unitCode}</p>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Qty"
                  value={quantities[ing.cloudId] ?? ""}
                  onChange={(e) => setQty(ing.cloudId, e.target.value)}
                  className="w-[5.5rem] shrink-0 rounded-xl border border-white/20 bg-zinc-900 px-3 py-3 text-right text-lg font-semibold tabular-nums text-white placeholder:text-white/30"
                />
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-base text-white/45">No ingredients match.</p>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        disabled={busy || linesForSubmit.length === 0}
        onClick={submit}
        className="w-full rounded-2xl bg-emerald-600 py-5 text-lg font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-45"
      >
        {busy ? "Saving…" : "Submit count session"}
      </button>
      {msg && <p className="text-center text-base text-emerald-400/95">{msg}</p>}
    </div>
  );
}
