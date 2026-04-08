import type { CartItem } from "@/lib/buildTransactionPayload";

export type ItemDetailForDrinkGuard = {
  id: string;
  hasSizes?: boolean;
  sizesByMode?: Record<string, Array<{ id: string; name: string }>>;
};

/**
 * True if the line's temperature + size still matches the item's synced sizesByMode (hasSizes flow).
 * Legacy lines (no baseType/sizeLabel) and items without drink-by-mode sizing always pass.
 */
export function isDrinkLineStillAllowed(item: CartItem, detail: ItemDetailForDrinkGuard): boolean {
  if (!item.baseType || item.sizeLabel == null || String(item.sizeLabel).trim() === "") return true;
  if (!detail.hasSizes || !detail.sizesByMode) return true;
  const modeList = detail.sizesByMode[item.baseType] ?? [];
  const sizePick = item.selectedOptions.find((o) => o.groupName === item.baseType);
  if (!sizePick) return false;
  return modeList.some((s) => s.id === sizePick.id);
}
