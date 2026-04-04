import { readFile } from "node:fs/promises";
import type { PrismaClient } from "@prisma/client";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const STORE_SYNC_SECRET = process.env.STORE_SYNC_SECRET ?? "";

type UploadResult = { ok: true } | { ok: false; status?: number; error?: string };

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (STORE_SYNC_SECRET.trim()) headers["x-store-sync-key"] = STORE_SYNC_SECRET;
  return headers;
}

async function postToCloud(path: string, body: Record<string, unknown>): Promise<UploadResult> {
  if (!CLOUD_URL.trim()) return { ok: false, error: "CLOUD_URL not configured" };
  const url = `${CLOUD_URL.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text.slice(0, 240) || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function toIso(v: Date): string {
  return v.toISOString();
}

async function buildImageBase64IfAny(pathValue: string | null | undefined): Promise<string | undefined> {
  if (!pathValue) return undefined;
  try {
    const bytes = await readFile(pathValue);
    return bytes.toString("base64");
  } catch {
    return undefined;
  }
}

async function uploadAttendance(prisma: PrismaClient, localId: string): Promise<UploadResult> {
  const row = await prisma.staffAttendanceEvent.findUnique({ where: { id: localId } });
  if (!row) return { ok: false, error: `attendance ${localId} not found` };
  const imageBase64 = await buildImageBase64IfAny(row.selfieLocalPath);
  return postToCloud("/sync/staff-ops/attendance", {
    sourceLocalId: row.id,
    storeId: row.storeId,
    staffCloudId: row.staffCloudId,
    staffName: row.staffName,
    staffRole: row.staffRole,
    eventType: row.eventType,
    happenedAt: toIso(row.happenedAt),
    imageBase64,
  });
}

async function uploadWaste(prisma: PrismaClient, localId: string): Promise<UploadResult> {
  const row = await prisma.wasteReport.findUnique({ where: { id: localId } });
  if (!row) return { ok: false, error: `waste ${localId} not found` };
  const imageBase64 = await buildImageBase64IfAny(row.imageLocalPath);
  return postToCloud("/sync/staff-ops/waste-reports", {
    sourceLocalId: row.id,
    storeId: row.storeId,
    staffCloudId: row.staffCloudId,
    staffName: row.staffName,
    itemType: row.itemType,
    inventoryItemCloudId: row.inventoryItemCloudId,
    inventoryItemName: row.inventoryItemName,
    quantity: row.quantity,
    unit: row.unit,
    reason: row.reason,
    notes: row.notes,
    happenedAt: toIso(row.happenedAt),
    imageBase64,
  });
}

async function uploadInventoryCount(prisma: PrismaClient, localId: string): Promise<UploadResult> {
  const row = await prisma.staffInventoryCountSession.findUnique({
    where: { id: localId },
    include: { lines: true },
  });
  if (!row) return { ok: false, error: `count ${localId} not found` };
  return postToCloud("/sync/staff-ops/inventory-count-sessions", {
    sourceLocalId: row.id,
    storeId: row.storeId,
    submittedByStaffCloudId: row.submittedByStaffCloudId,
    submittedByLocalStaffId: row.submittedByLocalStaffId,
    submittedByStaffName: row.submittedByStaffName,
    source: row.source,
    notes: row.notes,
    shiftType: row.shiftType,
    businessDate: row.businessDate,
    timeSubmitted: toIso(row.countedAt),
    auditSource: "staff_manual_inventory",
    countedAt: toIso(row.countedAt),
    snapshotJson: row.snapshotJson ?? undefined,
    lines: row.lines.map((l) => ({
      inventoryItemCloudId: l.inventoryItemCloudId,
      inventoryItemName: l.inventoryItemName,
      expectedQuantity: l.expectedQuantity,
      actualQuantity: l.actualQuantity,
      varianceQuantity: l.varianceQuantity,
      unit: l.unit,
      notes: l.notes,
      ingredientId: l.localIngredientId,
      openedAmount: l.openedAmount,
      sealedUnitCount: l.sealedUnitCount,
      sealedBoxCount: l.sealedBoxCount,
      totalAmount: l.totalAmount,
    })),
  });
}

async function uploadStockMovement(prisma: PrismaClient, localId: string): Promise<UploadResult> {
  const row = await prisma.staffStockMovementLocal.findUnique({ where: { id: localId } });
  if (!row) return { ok: false, error: `stock movement ${localId} not found` };
  return postToCloud("/sync/staff-ops/stock-movements", {
    sourceLocalId: row.id,
    storeId: row.storeId,
    movementKind: row.movementKind,
    ingredientId: row.ingredientCloudId,
    quantityBase: row.quantityBase,
    notes: row.notes,
    submittedByStaffCloudId: row.submittedByStaffCloudId,
    submittedByStaffName: row.submittedByStaffName,
    happenedAt: toIso(row.happenedAt),
  });
}

async function uploadSopSubmission(prisma: PrismaClient, localId: string): Promise<UploadResult> {
  const row = await prisma.sopChecklistSubmission.findUnique({ where: { id: localId } });
  if (!row) return { ok: false, error: `sop ${localId} not found` };
  return postToCloud("/sync/staff-ops/sop-submissions", {
    sourceLocalId: row.id,
    storeId: row.storeId,
    templateCloudId: row.templateCloudId,
    templateName: row.templateName,
    templateVersion: row.templateVersion,
    shiftType: row.shiftType,
    submittedByStaffCloudId: row.submittedByStaffCloudId,
    submittedByStaffName: row.submittedByStaffName,
    assignedShiftId: row.assignedShiftId,
    checklistResultJson: row.checklistResultJson,
    notes: row.notes,
    submittedAt: toIso(row.submittedAt),
  });
}

export async function processStaffOpsOutbox(
  prisma: PrismaClient,
  maxItems = 20
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const rows = await prisma.localOutbox.findMany({
    where: {
      topic: { startsWith: "staffops." },
      status: { in: ["PENDING", "FAILED"] },
    },
    orderBy: { createdAt: "asc" },
    take: maxItems,
  });
  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payloadJson) as { localId?: string };
      const localId = payload.localId;
      if (!localId) throw new Error("localId missing");
      let result: UploadResult;
      if (row.topic === "staffops.attendance.sync") {
        result = await uploadAttendance(prisma, localId);
      } else if (row.topic === "staffops.waste.sync") {
        result = await uploadWaste(prisma, localId);
      } else if (row.topic === "staffops.inventory-count.sync") {
        result = await uploadInventoryCount(prisma, localId);
      } else if (row.topic === "staffops.stock-movement.sync") {
        result = await uploadStockMovement(prisma, localId);
      } else if (row.topic === "staffops.sop.sync") {
        result = await uploadSopSubmission(prisma, localId);
      } else {
        throw new Error(`Unsupported topic ${row.topic}`);
      }
      if (!result.ok) throw new Error(result.error ?? `HTTP ${result.status ?? 0}`);

      await prisma.localOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", attempts: row.attempts + 1, lastAttemptAt: new Date(), lastError: null },
      });
      succeeded++;
    } catch (err) {
      await prisma.localOutbox.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          attempts: row.attempts + 1,
          lastAttemptAt: new Date(),
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
      failed++;
    }
  }
  return { processed: rows.length, succeeded, failed };
}
