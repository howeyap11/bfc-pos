"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";
import {
  type CountBreakdown,
  type IngCountMeta,
  emptyBreakdown,
  computeTotalAmount,
  formatCountTotal,
  guidedLineComplete,
  isValidQuantityString,
  normalizeInventoryIngredients,
} from "@/lib/inventoryCountShared";

type Ing = IngCountMeta;

type DraftV4 = { v: 4; breakdown: Record<string, CountBreakdown> };
type DraftLegacy = { v: 2 | 3; quantities: Record<string, string> };

const DRAFT_VERSION = 4 as const;

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

/** Guided count only: breakdown + computed total (sealed fields when ingredient supports them). */
function GuidedCountFieldGroup({
  ing,
  b,
  onPatch,
  inputRef,
  compact,
}: {
  ing: Ing;
  b: CountBreakdown;
  onPatch: (patch: Partial<CountBreakdown>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  compact?: boolean;
}) {
  const total = computeTotalAmount(ing, b);
  const showSealedU = ing.hasSealedUnits;
  const showSealedB = ing.hasSealedBoxes;
  const inp =
    "w-full rounded-xl border border-zinc-600 bg-black/30 px-3 py-3 text-center text-lg font-semibold tabular-nums text-white placeholder:text-white/25";

  return (
    <div className={`space-y-3 ${compact ? "" : "mt-4"}`}>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-center">
        <div className="text-xs font-medium uppercase tracking-wide text-emerald-200/80">totalAmount</div>
        <div className="text-2xl font-bold tabular-nums text-emerald-100">{formatCountTotal(total)}</div>
        <div className="text-xs text-white/40">{ing.unitCode}</div>
      </div>
      <label className="block">
        <span className="mb-1 block text-left text-xs text-white/50">openedAmount</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={b.openedAmount}
          onChange={(e) => onPatch({ openedAmount: e.target.value })}
          className={inp}
        />
      </label>
      {showSealedU ? (
        <label className="block">
          <span className="mb-1 block text-left text-xs text-white/50">
            sealedUnitCount ({ing.sealedUnitAmount} {ing.unitCode}/unit)
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={b.sealedUnitCount}
            onChange={(e) => onPatch({ sealedUnitCount: e.target.value.replace(/\D/g, "") })}
            className={inp}
          />
        </label>
      ) : null}
      {showSealedB ? (
        <label className="block">
          <span className="mb-1 block text-left text-xs text-white/50">
            sealedBoxCount ({ing.sealedBoxAmount} {ing.unitCode}/box)
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={b.sealedBoxCount}
            onChange={(e) => onPatch({ sealedBoxCount: e.target.value.replace(/\D/g, "") })}
            className={inp}
          />
        </label>
      ) : null}
    </div>
  );
}

function ManualListRow({
  ing,
  openedAmount,
  onOpenedChange,
}: {
  ing: Ing;
  openedAmount: string;
  onOpenedChange: (v: string) => void;
}) {
  const inp =
    "w-full min-w-[6rem] rounded-xl border border-zinc-600 bg-black/30 px-3 py-3 text-center text-lg font-semibold tabular-nums text-white placeholder:text-white/25";
  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-4 last:border-0">
      <IngredientThumb ing={ing} />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold leading-snug text-white">{ing.name}</p>
        <p className="mt-0.5 text-sm text-white/45">{ing.unitCode}</p>
      </div>
      <div className="w-[7.5rem] shrink-0 sm:w-36">
        <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">
          totalAmount
        </div>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={openedAmount}
          onChange={(e) => onOpenedChange(e.target.value)}
          className={inp}
        />
      </div>
    </div>
  );
}

export function StaffFullInventoryCount({ draftStorageKey }: { draftStorageKey: string }) {
  const [ingredients, setIngredients] = useState<Ing[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, CountBreakdown>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedOpenedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/staff/inventory/ingredients", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setIngredients(normalizeInventoryIngredients(d)))
      .catch(() => setIngredients([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftV4 | DraftLegacy | { lines?: unknown };
        if ("v" in parsed && parsed.v === 4 && parsed.breakdown && typeof parsed.breakdown === "object") {
          setBreakdown(parsed.breakdown);
        } else if (
          "v" in parsed &&
          (parsed.v === 2 || parsed.v === 3) &&
          parsed.quantities &&
          typeof parsed.quantities === "object"
        ) {
          const next: Record<string, CountBreakdown> = {};
          for (const [k, v] of Object.entries(parsed.quantities)) {
            next[k] = { openedAmount: String(v ?? ""), sealedUnitCount: "", sealedBoxCount: "" };
          }
          setBreakdown(next);
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
        const payload: DraftV4 = { v: DRAFT_VERSION, breakdown };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      } catch {
        /* quota */
      }
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draftStorageKey, draftLoaded, breakdown]);

  useEffect(() => {
    if (!guidedMode || ingredients.length === 0) return;
    setCurrentIndex((i) => Math.min(Math.max(0, i), ingredients.length - 1));
  }, [guidedMode, ingredients.length]);

  useEffect(() => {
    if (guidedMode && ingredients.length === 0) setGuidedMode(false);
  }, [guidedMode, ingredients.length]);

  useEffect(() => {
    if (!guidedMode) return;
    const t = window.setTimeout(() => guidedOpenedRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [guidedMode, currentIndex]);

  const getB = (cloudId: string): CountBreakdown => breakdown[cloudId] ?? emptyBreakdown();

  function patchLine(cloudId: string, patch: Partial<CountBreakdown>) {
    setBreakdown((prev) => {
      const cur = prev[cloudId] ?? emptyBreakdown();
      return { ...prev, [cloudId]: { ...cur, ...patch } };
    });
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(s));
  }, [ingredients, search]);

  const submitComplete = useMemo(() => {
    if (ingredients.length === 0) return false;
    for (const ing of ingredients) {
      const b = getB(ing.cloudId);
      if (guidedMode) {
        if (!guidedLineComplete(ing, b)) return false;
      } else if (!isValidQuantityString(b.openedAmount)) {
        return false;
      }
    }
    return true;
  }, [ingredients, breakdown, guidedMode]);

  const linesForSubmit = useMemo(() => {
    if (!submitComplete) return [];
    return ingredients.map((ing) => {
      const b = getB(ing.cloudId);
      const totalAmount = computeTotalAmount(ing, b);
      return {
        inventoryItemCloudId: ing.cloudId,
        inventoryItemName: ing.name,
        actualQuantity: String(totalAmount),
        unit: ing.unitCode,
        ...(guidedMode && b.openedAmount.trim() !== "" ? { openedAmount: b.openedAmount.trim() } : {}),
        ...(guidedMode && b.sealedUnitCount.trim() !== ""
          ? { sealedUnitCount: b.sealedUnitCount.trim() }
          : {}),
        ...(guidedMode && b.sealedBoxCount.trim() !== "" ? { sealedBoxCount: b.sealedBoxCount.trim() } : {}),
        totalAmount,
      };
    });
  }, [ingredients, breakdown, guidedMode, submitComplete]);

  async function submit() {
    if (!submitComplete || linesForSubmit.length === 0) {
      setMsg("Enter a valid count for every ingredient before submitting.");
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
      setBreakdown({});
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
            <GuidedCountFieldGroup
              ing={currentIng}
              b={getB(currentIng.cloudId)}
              onPatch={(p) => patchLine(currentIng.cloudId, p)}
              inputRef={guidedOpenedRef}
            />
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
          <div className="max-h-[min(58vh,28rem)] space-y-3 overflow-y-auto rounded-2xl border border-white/12 bg-black/25 p-3 sm:p-4">
            {filtered.map((ing) => {
              const b = getB(ing.cloudId);
              return (
                <ManualListRow
                  key={ing.cloudId}
                  ing={ing}
                  openedAmount={b.openedAmount}
                  onOpenedChange={(v) =>
                    patchLine(ing.cloudId, {
                      openedAmount: v,
                      sealedUnitCount: "",
                      sealedBoxCount: "",
                    })
                  }
                />
              );
            })}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-base text-white/45">No ingredients match.</p>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        disabled={busy || !submitComplete}
        onClick={submit}
        className="w-full rounded-2xl bg-emerald-600 py-5 text-lg font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-45"
      >
        {busy ? "Saving…" : "Submit count session"}
      </button>
      {msg && <p className="text-center text-base text-emerald-400/95">{msg}</p>}
    </div>
  );
}
