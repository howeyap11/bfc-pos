/**
 * Semantic inventory event kinds (stored on InventoryMovement.eventKind) for audit and snapshot tooling.
 * refType still carries idempotency keys (POS_CLOUD_SALE, WASTE_REPORT, …).
 */
export const InventoryEventKind = {
  TRANSACTION_CONSUMPTION: "TRANSACTION_CONSUMPTION",
  TRANSACTION_REVERSAL: "TRANSACTION_REVERSAL",
  WASTE_REPORT: "WASTE_REPORT",
  STORE_ADD: "STORE_ADD",
  WAREHOUSE_ADD: "WAREHOUSE_ADD",
  WH_PULLOUT_TO_STORE: "WH_PULLOUT_TO_STORE",
} as const;

export type InventoryEventKindValue = (typeof InventoryEventKind)[keyof typeof InventoryEventKind];

/** Stock bucket a movement row applies to (IngredientStock vs IngredientWarehouseStock). */
export const StockLocationCode = {
  STORE: "STORE",
  WAREHOUSE: "WAREHOUSE",
} as const;

export type StockLocationCodeValue = (typeof StockLocationCode)[keyof typeof StockLocationCode];
