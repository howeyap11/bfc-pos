/**
 * Frozen manual inventory snapshot at POS submit time (offline-first).
 * Cloud must not be consulted for timing or stock levels; local ledger + staff counts only.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

export type ManualCountLineInput = {
  inventoryItemCloudId: string;
  actualQuantity: string;
};

/** Embedded in snapshotJson as `_meta` for a self-describing audit blob. */
export type ManualSnapshotMeta = {
  submittedAtIso: string;
  businessDate: string;
  shiftType: string;
  submittedByStaffCloudId: string | null;
  submittedByLocalStaffId: string;
  submittedByStaffName: string;
  replacesSessionId: string | null;
};

export type ManualSnapshotBuildResult = {
  snapshotJson: string;
  /** Frozen expected store qty (base unit string) per cloud ingredient id — aligns line.expectedQuantity. */
  expectedStoreByCloudId: Map<string, string>;
};

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Builds snapshotJson: `_meta` + one entry per counted line with staffCount and expected stocks from local DB at submit instant.
 * Mirrors `storeStock` / `warehouseStock` for downstream parsers (cloud work log) while naming canonical frozen fields explicitly.
 */
export async function buildManualInventorySubmitSnapshot(
  db: Db,
  storeId: string,
  lines: ManualCountLineInput[],
  meta: ManualSnapshotMeta,
  options?: {
    /** Audit when a counted line references a cloud id with no local Ingredient row */
    snapshotWarn?: (meta: Record<string, unknown>, msg: string) => void;
  }
): Promise<ManualSnapshotBuildResult> {
  const ingredients: Record<
    string,
    {
      staffCount: number;
      expectedStoreStockAtSubmission: number;
      expectedWarehouseStockAtSubmission: number;
      storeStock: number;
      warehouseStock: number;
      localIngredientMapped: boolean;
    }
  > = {};
  const expectedStoreByCloudId = new Map<string, string>();

  for (const l of lines) {
    const cid = l.inventoryItemCloudId.trim();
    if (!cid) continue;
    let staffCount: number;
    try {
      staffCount = new Decimal(String(l.actualQuantity).trim()).toNumber();
      if (!Number.isFinite(staffCount)) staffCount = 0;
    } catch {
      staffCount = 0;
    }

    const ing = await db.ingredient.findFirst({
      where: { storeId, cloudIngredientCloudId: cid },
      select: {
        stocks: { select: { onHandQty: true } },
        warehouseStock: { select: { onHandQty: true } },
      },
    });
    const mapped = !!ing;
    if (!mapped && staffCount !== 0 && options?.snapshotWarn) {
      options.snapshotWarn(
        {
          event: "MANUAL_COUNT_UNMAPPED_CLOUD_INGREDIENT",
          storeId,
          inventoryItemCloudId: cid,
          staffCount,
          businessDate: meta.businessDate,
          shiftType: meta.shiftType,
        },
        "[INVENTORY] Manual count line has no local Ingredient for cloud id; expected stock frozen as 0"
      );
    }
    const storeQty = ing?.stocks ? new Decimal(ing.stocks.onHandQty).toNumber() : 0;
    const whQty = ing?.warehouseStock ? new Decimal(ing.warehouseStock.onHandQty).toNumber() : 0;

    ingredients[cid] = {
      staffCount,
      expectedStoreStockAtSubmission: storeQty,
      expectedWarehouseStockAtSubmission: whQty,
      storeStock: storeQty,
      warehouseStock: whQty,
      localIngredientMapped: mapped,
    };
    expectedStoreByCloudId.set(cid, new Decimal(storeQty).toString());
  }

  const payload = {
    _meta: meta,
    ...ingredients,
  };

  return { snapshotJson: JSON.stringify(payload), expectedStoreByCloudId };
}
