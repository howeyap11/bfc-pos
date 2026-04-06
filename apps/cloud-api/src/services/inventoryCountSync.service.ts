/**
 * Cloud ingest for staff manual inventory counts (audit/reporting).
 *
 * **snapshotJson:** When the sync payload includes non-empty `snapshotJson` (frozen on POS at submit),
 * cloud stores it **as-is** and does **not** call `getStockByIngredientLocation()`.
 *
 * **Legacy fallback:** If `snapshotJson` is absent/blank, cloud builds a snapshot from the **current**
 * cloud ledger at ingest (older clients / emergency only — not offline-first truth).
 *
 * - Idempotent replay: same sourceLocalId updates in place without revision bump.
 * - New local session (new sourceLocalId) for the same businessDate + shiftType creates a **new** cloud row so prior submissions
 *   stay immutable for history/variance; reporting uses latest session by `countedAt` per slot.
 */
import type { FastifyInstance } from "fastify";

export type InventoryCountIngestPayload = {
  storeId: string;
  sourceSessionId: string;
  submittedByStaffCloudId?: string | null;
  submittedByLocalStaffId?: string | null;
  submittedByStaffName: string;
  source: string;
  notes?: string | null;
  shiftType?: string | null;
  businessDate?: string | null;
  countedAt: string;
  /** When set (from POS frozen snapshot), used as-is; otherwise computed at ingest from cloud ledger */
  snapshotJson?: string | null;
  lines: Array<Record<string, unknown>>;
};

export async function upsertSyncedInventoryCountSession(
  app: FastifyInstance,
  d: InventoryCountIngestPayload
): Promise<{ id: string }> {
  const countedAt = new Date(d.countedAt);
  const businessDate = d.businessDate?.trim() || null;
  const shiftType = d.shiftType?.trim() || null;

  let snapshotJson: string;
  if (d.snapshotJson?.trim()) {
    snapshotJson = d.snapshotJson.trim();
    app.log.info(
      { storeId: d.storeId, sourceSessionId: d.sourceSessionId },
      "[InventoryCount] Using payload snapshotJson (local/POS frozen) — skipping cloud ledger snapshot"
    );
  } else {
    app.log.warn(
      { storeId: d.storeId, sourceSessionId: d.sourceSessionId },
      "[InventoryCount] No snapshotJson in payload — computing snapshot from cloud ledger (legacy fallback)"
    );
    const locations = await app.prisma.inventoryLocation.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    });
    const mainCafe = locations.find((l) => l.code === "MAIN_CAFE");
    const warehouse = locations.find((l) => l.code === "WAREHOUSE");
    const byKey = await app.inventoryService.getStockByIngredientLocation();

    const snapshot: Record<string, { storeStock: number; warehouseStock: number }> = {};
    for (const raw of d.lines) {
      const line = raw as Record<string, unknown>;
      const ingId = String(line.inventoryItemCloudId ?? "").trim();
      if (!ingId) continue;
      snapshot[ingId] = {
        storeStock: mainCafe ? (byKey.get(`${ingId}:${mainCafe.id}`) ?? 0) : 0,
        warehouseStock: warehouse ? (byKey.get(`${ingId}:${warehouse.id}`) ?? 0) : 0,
      };
    }
    snapshotJson = JSON.stringify(snapshot);
  }

  const lineCreates = d.lines.map((line) => {
    const l = line as Record<string, unknown>;
    return {
      inventoryItemCloudId: String(l.inventoryItemCloudId ?? ""),
      inventoryItemName: String(l.inventoryItemName ?? "Unknown"),
      expectedQuantity: l.expectedQuantity != null ? String(l.expectedQuantity) : null,
      actualQuantity: String(l.actualQuantity ?? "0"),
      varianceQuantity: l.varianceQuantity != null ? String(l.varianceQuantity) : null,
      unit: l.unit != null ? String(l.unit) : null,
      notes: l.notes != null ? String(l.notes) : null,
      openedAmount: l.openedAmount != null && String(l.openedAmount).trim() !== "" ? String(l.openedAmount) : null,
      sealedUnitCount:
        l.sealedUnitCount != null && String(l.sealedUnitCount).trim() !== "" ? String(l.sealedUnitCount) : null,
      sealedBoxCount:
        l.sealedBoxCount != null && String(l.sealedBoxCount).trim() !== "" ? String(l.sealedBoxCount) : null,
      totalAmount: l.totalAmount != null && String(l.totalAmount).trim() !== "" ? String(l.totalAmount) : null,
    };
  });

  const existingByLocal = await app.prisma.syncedInventoryCountSession.findUnique({
    where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceSessionId } },
  });

  let rowId: string;

  if (existingByLocal) {
    await app.prisma.syncedInventoryCountSession.update({
      where: { id: existingByLocal.id },
      data: {
        submittedByStaffCloudId: d.submittedByStaffCloudId ?? null,
        submittedByLocalStaffId: d.submittedByLocalStaffId ?? null,
        submittedByStaffName: d.submittedByStaffName,
        source: d.source,
        notes: d.notes ?? null,
        shiftType,
        businessDate,
        countedAt,
        snapshotJson,
      },
    });
    rowId = existingByLocal.id;
  } else if (businessDate && shiftType) {
    const latestForSlot = await app.prisma.syncedInventoryCountSession.findFirst({
      where: { storeId: d.storeId, businessDate, shiftType },
      orderBy: { countedAt: "desc" },
    });
    const nextRevision = (latestForSlot?.revision ?? 0) + 1;
    const created = await app.prisma.syncedInventoryCountSession.create({
      data: {
        sourceLocalId: d.sourceSessionId,
        storeId: d.storeId,
        submittedByStaffCloudId: d.submittedByStaffCloudId ?? null,
        submittedByLocalStaffId: d.submittedByLocalStaffId ?? null,
        submittedByStaffName: d.submittedByStaffName,
        source: d.source,
        notes: d.notes ?? null,
        shiftType,
        businessDate,
        countedAt,
        snapshotJson,
        revision: nextRevision,
      },
    });
    rowId = created.id;
  } else {
    const created = await app.prisma.syncedInventoryCountSession.create({
      data: {
        sourceLocalId: d.sourceSessionId,
        storeId: d.storeId,
        submittedByStaffCloudId: d.submittedByStaffCloudId ?? null,
        submittedByLocalStaffId: d.submittedByLocalStaffId ?? null,
        submittedByStaffName: d.submittedByStaffName,
        source: d.source,
        notes: d.notes ?? null,
        shiftType,
        businessDate,
        countedAt,
        snapshotJson,
        revision: 1,
      },
    });
    rowId = created.id;
  }

  await app.prisma.syncedInventoryCountLine.deleteMany({ where: { sessionId: rowId } });
  await app.prisma.syncedInventoryCountLine.createMany({
    data: lineCreates.map((lc) => ({ ...lc, sessionId: rowId })),
  });

  return { id: rowId };
}
