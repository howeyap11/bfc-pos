/**
 * Frozen manual inventory snapshot at POS submit time (offline-first).
 * Cloud must not be consulted for timing or stock levels; local ledger + staff counts only.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

export type ManualCountLineInput = {
  inventoryItemCloudId: string;
  /** Normalized total in ingredient base UOM (authoritative for variance vs expected). */
  actualQuantity: string;
  /** Local Ingredient.id when known */
  ingredientId?: string | null;
  openedAmount?: number | null;
  sealedUnitCount?: number | null;
  sealedBoxCount?: number | null;
  totalAmount?: number | null;
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

function safeDecimalQty(s: string | number | null | undefined): Decimal {
  try {
    if (s == null || s === "") return new Decimal(0);
    return new Decimal(String(s).trim());
  } catch {
    return new Decimal(0);
  }
}

function safeInt(n: number | string | null | undefined): number {
  if (n == null || n === "") return 0;
  const x = typeof n === "number" ? Math.trunc(n) : parseInt(String(n).trim(), 10);
  return Number.isFinite(x) ? x : 0;
}

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
      ingredientId?: string;
      openedAmount: number;
      sealedUnitCount: number;
      sealedBoxCount: number;
      totalAmount: number;
    }
  > = {};
  const expectedStoreByCloudId = new Map<string, string>();

  for (const l of lines) {
    const cid = l.inventoryItemCloudId.trim();
    if (!cid) continue;

    const totalFromField =
      l.totalAmount != null && Number.isFinite(l.totalAmount)
        ? l.totalAmount
        : safeDecimalQty(l.actualQuantity).toNumber();
    const staffCount = Number.isFinite(totalFromField) ? totalFromField : 0;

    const hasExplicitBreakdown =
      l.openedAmount != null ||
      (l.sealedUnitCount != null && safeInt(l.sealedUnitCount) !== 0) ||
      (l.sealedBoxCount != null && safeInt(l.sealedBoxCount) !== 0);

    const openedAmountNum = hasExplicitBreakdown
      ? l.openedAmount != null && Number.isFinite(Number(l.openedAmount))
        ? Number(l.openedAmount)
        : 0
      : staffCount;

    const sealedUnitCountNum = hasExplicitBreakdown ? safeInt(l.sealedUnitCount) : 0;
    const sealedBoxCountNum = hasExplicitBreakdown ? safeInt(l.sealedBoxCount) : 0;
    const totalAmountNum = staffCount;

    const ing = await db.ingredient.findFirst({
      where: { storeId, cloudIngredientCloudId: cid },
      select: {
        id: true,
        stocks: { select: { onHandQty: true } },
        warehouseStock: { select: { onHandQty: true } },
      },
    });
    const mapped = !!ing;
    const resolvedIngredientId = (l.ingredientId?.trim() || ing?.id) ?? undefined;

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

    const entry: (typeof ingredients)[string] = {
      staffCount,
      expectedStoreStockAtSubmission: storeQty,
      expectedWarehouseStockAtSubmission: whQty,
      storeStock: storeQty,
      warehouseStock: whQty,
      localIngredientMapped: mapped,
      openedAmount: openedAmountNum,
      sealedUnitCount: sealedUnitCountNum,
      sealedBoxCount: sealedBoxCountNum,
      totalAmount: totalAmountNum,
    };
    if (resolvedIngredientId) entry.ingredientId = resolvedIngredientId;
    ingredients[cid] = entry;
    expectedStoreByCloudId.set(cid, new Decimal(storeQty).toString());
  }

  const payload = {
    _meta: meta,
    ...ingredients,
  };

  return { snapshotJson: JSON.stringify(payload), expectedStoreByCloudId };
}
