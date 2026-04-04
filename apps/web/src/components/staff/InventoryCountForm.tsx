"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";
import {
  computeTotalAmount,
  emptyBreakdown,
  formatCountTotal,
  lineHasAny,
  normalizeInventoryIngredients,
  type CountBreakdown,
  type IngCountMeta,
} from "@/lib/inventoryCountShared";

type InventoryCountFormProps = {
  compact?: boolean;
  source?: "STAFF_UI" | "POS";
  /** When set, autosave draft to localStorage (restore on load). */
  draftStorageKey?: string | null;
  /** Load synced ingredients and pick items (staff phone); otherwise manual cloud id fields (POS). */
  useIngredientPicker?: boolean;
};

type CountLine = {
  inventoryItemCloudId: string;
  inventoryItemName: string;
  /** Manual / POS mode: single quantity string (legacy). Picker mode uses breakdown + computed total. */
  actualQuantity: string;
  breakdown: CountBreakdown;
  unit?: string;
  notes?: string;
};

const emptyLine = (): CountLine => ({
  inventoryItemCloudId: "",
  inventoryItemName: "",
  actualQuantity: "",
  breakdown: emptyBreakdown(),
});

function normalizeDraftLines(raw: unknown): CountLine[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyLine()];
  return raw.map((x) => {
    const r = x as Record<string, unknown>;
    const cloudId = String(r.inventoryItemCloudId ?? "");
    const name = String(r.inventoryItemName ?? "");
    const aq = String(r.actualQuantity ?? "");
    const br = r.breakdown as CountBreakdown | undefined;
    const breakdown: CountBreakdown =
      br && typeof br === "object"
        ? {
            openedAmount: String((br as CountBreakdown).openedAmount ?? ""),
            sealedUnitCount: String((br as CountBreakdown).sealedUnitCount ?? ""),
            sealedBoxCount: String((br as CountBreakdown).sealedBoxCount ?? ""),
          }
        : aq.trim()
          ? { openedAmount: aq, sealedUnitCount: "", sealedBoxCount: "" }
          : emptyBreakdown();
    return {
      inventoryItemCloudId: cloudId,
      inventoryItemName: name,
      actualQuantity: breakdown.openedAmount.trim() === "" ? aq : "",
      breakdown,
      unit: r.unit != null ? String(r.unit) : undefined,
      notes: r.notes != null ? String(r.notes) : undefined,
    };
  });
}

export function InventoryCountForm({
  compact = false,
  source = "STAFF_UI",
  draftStorageKey = null,
  useIngredientPicker = false,
}: InventoryCountFormProps) {
  const [ingredients, setIngredients] = useState<IngCountMeta[]>([]);
  const [lines, setLines] = useState<CountLine[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(!draftStorageKey);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!useIngredientPicker) return;
    fetch("/api/staff/inventory/ingredients", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setIngredients(normalizeInventoryIngredients(d)))
      .catch(() => setIngredients([]));
  }, [useIngredientPicker]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") {
      setDraftLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { lines?: unknown };
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setLines(normalizeDraftLines(parsed.lines));
        }
      }
    } catch {
      /* ignore */
    }
    setDraftLoaded(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined" || !draftLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify({ lines }));
      } catch {
        /* quota */
      }
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draftStorageKey, draftLoaded, lines]);

  const validLines = useMemo(() => {
    if (useIngredientPicker) {
      return lines.filter(
        (l) => l.inventoryItemCloudId.trim() && l.inventoryItemName.trim() && lineHasAny(l.breakdown)
      );
    }
    return lines.filter(
      (l) => l.inventoryItemCloudId.trim() && l.inventoryItemName.trim() && l.actualQuantity.trim()
    );
  }, [lines, useIngredientPicker]);

  function updateLine(index: number, patch: Partial<CountLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((_, i) => i !== index)));
  }

  function onPickIngredient(index: number, cloudId: string) {
    const ing = ingredients.find((i) => i.cloudId === cloudId);
    updateLine(index, {
      inventoryItemCloudId: cloudId,
      inventoryItemName: ing?.name ?? "",
      unit: ing?.unitCode ?? "",
      breakdown: emptyBreakdown(),
      actualQuantity: "",
    });
  }

  function lineMeta(cloudId: string): IngCountMeta | undefined {
    return ingredients.find((i) => i.cloudId === cloudId);
  }

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const payloadLines = useIngredientPicker
        ? validLines.map((l) => {
            const ing = lineMeta(l.inventoryItemCloudId);
            if (!ing) throw new Error("Missing ingredient for line");
            const b = l.breakdown;
            const totalAmount = computeTotalAmount(ing, b);
            return {
              inventoryItemCloudId: l.inventoryItemCloudId,
              inventoryItemName: l.inventoryItemName,
              actualQuantity: String(totalAmount),
              unit: l.unit ?? ing.unitCode,
              notes: l.notes,
              ...(b.openedAmount.trim() !== "" ? { openedAmount: b.openedAmount.trim() } : {}),
              ...(b.sealedUnitCount.trim() !== "" ? { sealedUnitCount: b.sealedUnitCount.trim() } : {}),
              ...(b.sealedBoxCount.trim() !== "" ? { sealedBoxCount: b.sealedBoxCount.trim() } : {}),
              totalAmount,
            };
          })
        : validLines;
      const res = await fetch("/api/staff/inventory-count-sessions", {
        method: "POST",
        headers: withStaffAuthHeaders(),
        body: JSON.stringify({
          source,
          lines: payloadLines,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      setMsg("Inventory count saved locally and queued for sync.");
      setLines([emptyLine()]);
      if (draftStorageKey) {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Manual inventory count</h3>
      {draftStorageKey && (
        <p className="mb-3 text-xs text-white/50">Draft autosaves on this device. Cleared after submit.</p>
      )}
      <div className="space-y-3">
        {lines.map((l, i) => (
          <div key={i} className={`grid gap-2 rounded-lg border border-white/5 bg-black/15 p-3 ${compact ? "grid-cols-1" : "md:grid-cols-2"}`}>
            {useIngredientPicker ? (
              <select
                className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white"
                value={l.inventoryItemCloudId}
                onChange={(e) => onPickIngredient(i, e.target.value)}
              >
                <option value="">Select ingredient…</option>
                {ingredients.map((ing) => (
                  <option key={ing.cloudId} value={ing.cloudId}>
                    {ing.name} ({ing.unitCode})
                  </option>
                ))}
              </select>
            ) : (
              <>
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
              </>
            )}
            {useIngredientPicker && l.inventoryItemCloudId ? (
              (() => {
                const ing = lineMeta(l.inventoryItemCloudId);
                if (!ing) return null;
                const total = computeTotalAmount(ing, l.breakdown);
                const b = l.breakdown;
                const inp = "w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white";
                return (
                  <div className="space-y-2 md:col-span-2">
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-emerald-200/80">totalAmount</div>
                      <div className="text-xl font-semibold tabular-nums text-white">
                        {formatCountTotal(total)} <span className="text-sm font-normal text-white/60">{ing.unitCode}</span>
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs text-white/50">openedAmount</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        value={b.openedAmount}
                        onChange={(e) =>
                          updateLine(i, { breakdown: { ...b, openedAmount: e.target.value } })
                        }
                        className={inp}
                      />
                    </label>
                    {ing.hasSealedUnits ? (
                      <label className="block">
                        <span className="mb-1 block text-xs text-white/50">
                          sealedUnitCount ({ing.sealedUnitAmount} {ing.unitCode}/unit)
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="0"
                          value={b.sealedUnitCount}
                          onChange={(e) =>
                            updateLine(i, { breakdown: { ...b, sealedUnitCount: e.target.value } })
                          }
                          className={inp}
                        />
                      </label>
                    ) : null}
                    {ing.hasSealedBoxes ? (
                      <label className="block">
                        <span className="mb-1 block text-xs text-white/50">
                          sealedBoxCount ({ing.sealedBoxAmount} {ing.unitCode}/box)
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="0"
                          value={b.sealedBoxCount}
                          onChange={(e) =>
                            updateLine(i, { breakdown: { ...b, sealedBoxCount: e.target.value } })
                          }
                          className={inp}
                        />
                      </label>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              <input
                placeholder="Actual quantity"
                value={l.actualQuantity}
                onChange={(e) => updateLine(i, { actualQuantity: e.target.value })}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
              />
            )}
            {!useIngredientPicker && (
              <input
                placeholder="Unit (optional)"
                value={l.unit ?? ""}
                onChange={(e) => updateLine(i, { unit: e.target.value })}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white"
              />
            )}
            <input
              placeholder="Line notes (optional)"
              value={l.notes ?? ""}
              onChange={(e) => updateLine(i, { notes: e.target.value })}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white md:col-span-2"
            />
            <button
              type="button"
              onClick={() => removeLine(i)}
              className="text-left text-xs text-red-400/90 md:col-span-2"
            >
              Remove line
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={addLine} className="rounded-md bg-white/10 px-3 py-2 text-sm text-white">
          Add line
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
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
