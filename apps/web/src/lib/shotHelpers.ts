/**
 * Single source of truth for included (free) shots and chargeable extra shots.
 * Used by POS item config, cart pricing, and display. Backend defines included
 * shots per menu item + size + temperature; these helpers resolve and apply consistently.
 */

export type ItemForIncludedShots = {
  /** Backend-derived: key = `${baseType}|${sizeOptionCloudId}`, value = included shots for that size+temp */
  includedShotsBySizeAndTemp?: Record<string, number>;
  /** Item-level fallback when no per-size+temp config (e.g. from cloud defaultShots) */
  defaultShots?: number;
  /** Legacy: included shots for "12oz" size (name-based); used when no includedShotsBySizeAndTemp */
  defaultShots12oz?: number;
  /** Legacy: included shots for "16oz" / other sizes; used when no includedShotsBySizeAndTemp */
  defaultShots16oz?: number;
};

/**
 * Resolves the number of included (free) shots for the selected size + temperature.
 * Prefers backend-derived includedShotsBySizeAndTemp, then item defaultShots, then legacy size-only defaults.
 */
export function resolveIncludedShots(args: {
  item: ItemForIncludedShots;
  selectedSizeId: string | null | undefined;
  selectedTemp: string | null | undefined;
}): number {
  const { item, selectedSizeId, selectedTemp } = args;
  const temp = (selectedTemp ?? "").toUpperCase();

  if (item.includedShotsBySizeAndTemp && selectedSizeId && (temp === "HOT" || temp === "ICED" || temp === "CONCENTRATED")) {
    const key = `${temp}|${selectedSizeId}`;
    const value = item.includedShotsBySizeAndTemp[key];
    if (typeof value === "number" && value >= 0) return value;
  }

  if (typeof item.defaultShots === "number" && item.defaultShots >= 0) {
    return item.defaultShots;
  }

  return 0;
}

/**
 * Resolves included shots when only size name is available (e.g. legacy or no temp yet).
 * Uses includedShotsBySizeAndTemp with first matching temp, or legacy 12/16 name hack.
 */
export function resolveIncludedShotsBySizeName(args: {
  item: ItemForIncludedShots;
  selectedSizeId: string | null | undefined;
  sizeName?: string | null;
}): number {
  const { item, selectedSizeId, sizeName } = args;
  if (item.includedShotsBySizeAndTemp && selectedSizeId) {
    for (const temp of ["HOT", "ICED", "CONCENTRATED"]) {
      const key = `${temp}|${selectedSizeId}`;
      const value = item.includedShotsBySizeAndTemp[key];
      if (typeof value === "number" && value >= 0) return value;
    }
  }
  if (typeof item.defaultShots === "number" && item.defaultShots >= 0) return item.defaultShots;
  const name = (sizeName ?? "").toLowerCase();
  if (name.includes("12") || name.includes("12oz")) return item.defaultShots12oz ?? 0;
  return item.defaultShots16oz ?? item.defaultShots12oz ?? 0;
}

/**
 * Chargeable extra shots = max(0, selectedShots - includedShots).
 * Use this for pricing and for display of "X charged".
 */
export function resolveChargeableExtraShots(args: {
  selectedShots: number;
  includedShots: number;
}): number {
  return Math.max(0, args.selectedShots - args.includedShots);
}
