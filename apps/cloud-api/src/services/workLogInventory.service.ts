/**
 * Work Log: inventory variance summary and per-line comparison for a business date + shift.
 */
import type { PrismaClient } from "@prisma/client";
import { utcRangeForStaffBusinessDateKey } from "../lib/staffBusinessDate.js";
import { getWorkDayRolloverMinutesFromDb } from "./workDaySettings.service.js";
import {
  getIngredientMovementRollups,
  sumWasteFromSyncedReports,
} from "./inventoryMovementAggregates.service.js";

function parseQty(s: string | null | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : 0;
}

type SnapshotEntry = { storeStock: number; warehouseStock: number };

/** Parses POS snapshotJson: skips `_meta`, prefers explicit frozen fields from Phase E snapshot shape. */
function parseSnapshot(json: string | null | undefined): Record<string, SnapshotEntry> {
  if (!json) return {};
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const out: Record<string, SnapshotEntry> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "_meta" || !v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      const storeRaw =
        r.expectedStoreStockAtSubmission !== undefined && r.expectedStoreStockAtSubmission !== null
          ? Number(r.expectedStoreStockAtSubmission)
          : Number(r.storeStock);
      const whRaw =
        r.expectedWarehouseStockAtSubmission !== undefined && r.expectedWarehouseStockAtSubmission !== null
          ? Number(r.expectedWarehouseStockAtSubmission)
          : Number(r.warehouseStock);
      out[k] = {
        storeStock: Number.isFinite(storeRaw) ? storeRaw : 0,
        warehouseStock: Number.isFinite(whRaw) ? whRaw : 0,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function getInventoryVarianceTotalsForDay(
  prisma: PrismaClient,
  storeId: string,
  businessDate: string
): Promise<{ beginningTotalAbsVariance: number; endTotalAbsVariance: number }> {
  const shifts = ["Beginning", "End"] as const;
  const out = { beginningTotalAbsVariance: 0, endTotalAbsVariance: 0 };
  for (const shiftType of shifts) {
    const session = await prisma.syncedInventoryCountSession.findFirst({
      where: { storeId, businessDate, shiftType },
      orderBy: { countedAt: "desc" },
      include: { lines: true },
    });
    if (!session) continue;
    const snap = parseSnapshot(session.snapshotJson);
    let sum = 0;
    for (const line of session.lines) {
      const ingId = line.inventoryItemCloudId;
      const staff = parseQty(line.actualQuantity);
      const systemAtSubmit = snap[ingId]?.storeStock ?? parseQty(line.expectedQuantity);
      sum += Math.abs(staff - systemAtSubmit);
    }
    if (shiftType === "Beginning") out.beginningTotalAbsVariance = sum;
    else out.endTotalAbsVariance = sum;
  }
  return out;
}

export type WorkLogInventoryCompareRow = {
  ingredientId: string;
  ingredientName: string;
  imageUrl: string | null;
  categoryName: string | null;
  unitCode: string;
  staffCount: number;
  shiftType: string;
  systemStoreStockAtSubmit: number;
  variance: number;
  storeStockCurrent: number;
  storeAdded: number;
  waste: number;
  warehouseStockCurrent: number;
  warehouseAdded: number;
  pulledOut: number;
};

function normalizeInventoryShiftType(shiftType: string): "Beginning" | "End" {
  const u = shiftType.trim().toUpperCase();
  if (u === "END" || u === "CLOSING" || u === "END_SHIFT") return "End";
  return "Beginning";
}

export async function buildWorkLogInventoryCompare(
  prisma: PrismaClient,
  storeId: string,
  businessDate: string,
  shiftType: string
): Promise<WorkLogInventoryCompareRow[]> {
  const canonShift = normalizeInventoryShiftType(shiftType);
  const session = await prisma.syncedInventoryCountSession.findFirst({
    where: { storeId, businessDate, shiftType: canonShift },
    orderBy: { countedAt: "desc" },
    include: { lines: true },
  });
  if (!session) return [];

  const rollover = await getWorkDayRolloverMinutesFromDb(prisma);
  const range = utcRangeForStaffBusinessDateKey(businessDate, rollover);
  const [moveDay, wasteDay, byKey] = await Promise.all([
    getIngredientMovementRollups(prisma, range),
    sumWasteFromSyncedReports(prisma, range),
    prisma.ingredient.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        unitCode: true,
        category: { select: { name: true } },
      },
    }),
  ]);
  const ingMeta = new Map(byKey.map((i) => [i.id, i]));

  const locations = await prisma.inventoryLocation.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });
  const mainId = locations.find((l) => l.code === "MAIN_CAFE")?.id;
  const whId = locations.find((l) => l.code === "WAREHOUSE")?.id;
  const movements = await prisma.stockMovement.findMany({
    select: { ingredientId: true, locationId: true, quantityDeltaBaseUnit: true },
  });
  const stockMap = new Map<string, number>();
  for (const mv of movements) {
    const key = `${mv.ingredientId}:${mv.locationId}`;
    stockMap.set(key, (stockMap.get(key) ?? 0) + Number(mv.quantityDeltaBaseUnit));
  }
  const snap = parseSnapshot(session.snapshotJson);
  const rows: WorkLogInventoryCompareRow[] = [];

  for (const line of session.lines) {
    const ingredientId = line.inventoryItemCloudId;
    const meta = ingMeta.get(ingredientId);
    const staffCount = parseQty(line.actualQuantity);
    const systemStoreStockAtSubmit = snap[ingredientId]?.storeStock ?? parseQty(line.expectedQuantity);
    const roll = moveDay.get(ingredientId) ?? { storeAdded: 0, warehouseAdded: 0, pulledOut: 0 };
    rows.push({
      ingredientId,
      ingredientName: meta?.name ?? line.inventoryItemName,
      imageUrl: meta?.imageUrl ?? null,
      categoryName: meta?.category?.name ?? null,
      unitCode: meta?.unitCode ?? line.unit ?? "",
      staffCount,
      shiftType: canonShift,
      systemStoreStockAtSubmit,
      variance: staffCount - systemStoreStockAtSubmit,
      storeStockCurrent: mainId ? (stockMap.get(`${ingredientId}:${mainId}`) ?? 0) : Number.NaN,
      storeAdded: mainId ? roll.storeAdded : Number.NaN,
      waste: wasteDay.get(ingredientId) ?? 0,
      warehouseStockCurrent: whId ? (stockMap.get(`${ingredientId}:${whId}`) ?? 0) : Number.NaN,
      warehouseAdded: whId ? roll.warehouseAdded : Number.NaN,
      pulledOut: whId ? roll.pulledOut : Number.NaN,
    });
  }
  return rows;
}
