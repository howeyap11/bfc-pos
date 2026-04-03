/**
 * Aggregates stock movements for cloud inventory reporting (ledger-based).
 * Waste totals for UI "Waste" column use synced waste reports (operational truth) to avoid
 * double-counting before ledger WASTE rows are universally posted.
 */
import type { PrismaClient } from "@prisma/client";

export type IngredientMovementRollup = {
  storeAdded: number;
  warehouseAdded: number;
  pulledOut: number;
};

function dec(n: unknown): number {
  if (n == null) return 0;
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

async function resolveMainAndWarehouse(prisma: PrismaClient): Promise<{ mainId?: string; whId?: string }> {
  const locations = await prisma.inventoryLocation.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });
  return {
    mainId: locations.find((l) => l.code === "MAIN_CAFE")?.id,
    whId: locations.find((l) => l.code === "WAREHOUSE")?.id,
  };
}

export async function sumWasteFromSyncedReports(
  prisma: PrismaClient,
  range?: { start: Date; end: Date }
): Promise<Map<string, number>> {
  const where: { happenedAt?: { gte: Date; lt: Date }; inventoryItemCloudId: { not: null } } = {
    inventoryItemCloudId: { not: null },
  };
  if (range) {
    where.happenedAt = { gte: range.start, lt: range.end };
  }
  const rows = await prisma.syncedWasteReport.findMany({
    where,
    select: { inventoryItemCloudId: true, quantity: true },
  });
  const map = new Map<string, number>();
  for (const w of rows) {
    const id = w.inventoryItemCloudId!;
    const q = dec(w.quantity);
    map.set(id, (map.get(id) ?? 0) + Math.abs(q));
  }
  return map;
}

export async function getIngredientMovementRollups(
  prisma: PrismaClient,
  range?: { start: Date; end: Date }
): Promise<Map<string, IngredientMovementRollup>> {
  const { mainId, whId } = await resolveMainAndWarehouse(prisma);

  const groups = await prisma.stockMovement.groupBy({
    by: ["ingredientId", "locationId", "movementType"],
    ...(range ? { where: { createdAt: { gte: range.start, lt: range.end } } } : {}),
    _sum: { quantityDeltaBaseUnit: true },
  });

  const map = new Map<string, IngredientMovementRollup>();

  function ensure(ingId: string): IngredientMovementRollup {
    let r = map.get(ingId);
    if (!r) {
      r = { storeAdded: 0, warehouseAdded: 0, pulledOut: 0 };
      map.set(ingId, r);
    }
    return r;
  }

  for (const g of groups) {
    const ing = g.ingredientId;
    const v = dec(g._sum.quantityDeltaBaseUnit);
    const r = ensure(ing);

    if (mainId && g.locationId === mainId) {
      if (g.movementType === "PURCHASE_ADD" || g.movementType === "TRANSFER_IN") {
        r.storeAdded += Math.max(0, v);
      } else if (g.movementType === "MANUAL_ADJUSTMENT" && v > 0) {
        r.storeAdded += v;
      }
    }
    if (whId && g.locationId === whId) {
      if (g.movementType === "PURCHASE_ADD") {
        r.warehouseAdded += Math.max(0, v);
      } else if (g.movementType === "MANUAL_ADJUSTMENT" && v > 0) {
        r.warehouseAdded += v;
      } else if (g.movementType === "TRANSFER_OUT") {
        r.pulledOut += Math.abs(v);
      }
    }
  }

  return map;
}
