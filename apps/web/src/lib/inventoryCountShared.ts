/** Shared staff manual inventory count helpers (opened + sealed units/boxes). */

export type CountBreakdown = {
  openedAmount: string;
  sealedUnitCount: string;
  sealedBoxCount: string;
};

export type IngCountMeta = {
  cloudId: string;
  name: string;
  unitCode: string;
  imageUrl?: string | null;
  sortOrder: number;
  hasSealedUnits: boolean;
  hasSealedBoxes: boolean;
  sealedUnitAmount: number;
  sealedBoxAmount: number;
};

export function emptyBreakdown(): CountBreakdown {
  return { openedAmount: "", sealedUnitCount: "", sealedBoxCount: "" };
}

export function computeTotalAmount(ing: IngCountMeta, b: CountBreakdown): number {
  const opened = parseFloat(String(b.openedAmount).trim() || "") || 0;
  const su = Math.max(0, parseInt(String(b.sealedUnitCount).trim() || "0", 10) || 0);
  const sb = Math.max(0, parseInt(String(b.sealedBoxCount).trim() || "0", 10) || 0);
  const u = ing.hasSealedUnits ? ing.sealedUnitAmount : 0;
  const bx = ing.hasSealedBoxes ? ing.sealedBoxAmount : 0;
  return opened + su * u + sb * bx;
}

export function lineHasAny(b: CountBreakdown): boolean {
  return (
    b.openedAmount.trim() !== "" || b.sealedUnitCount.trim() !== "" || b.sealedBoxCount.trim() !== ""
  );
}

export function formatCountTotal(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function normalizeInventoryIngredients(raw: unknown): IngCountMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x: Record<string, unknown>) => ({
    cloudId: String(x.cloudId ?? ""),
    name: String(x.name ?? ""),
    unitCode: String(x.unitCode ?? ""),
    imageUrl: (x.imageUrl as string | null | undefined) ?? null,
    sortOrder: typeof x.sortOrder === "number" ? x.sortOrder : 0,
    hasSealedUnits: !!x.hasSealedUnits,
    hasSealedBoxes: !!x.hasSealedBoxes,
    sealedUnitAmount: typeof x.sealedUnitAmount === "number" ? x.sealedUnitAmount : 0,
    sealedBoxAmount: typeof x.sealedBoxAmount === "number" ? x.sealedBoxAmount : 0,
  }));
}
