/**
 * Unified Work Log view model for cloud admin — aggregates synced staff ops rows
 * without replacing underlying tables. businessDate uses StoreSetting work-day rollover when missing on row.
 */
import type { PrismaClient } from "@prisma/client";
import { staffBusinessDateKeyWithRollover, utcRangeForStaffBusinessDateKey } from "../lib/staffBusinessDate.js";
import { getWorkDayRolloverMinutesFromDb } from "./workDaySettings.service.js";

export type WorkLogKind =
  | "attendance"
  | "inventory"
  | "waste"
  | "sop"
  | "shifts"
  | "violations"
  | "stock_movements"
  | "all";

export type WorkLogEntry = {
  id: string;
  storeId: string;
  businessDate: string;
  actionType: string;
  actorName: string;
  actorStaffCloudId: string | null;
  occurredAt: string;
  summary: string;
  referenceType: string;
  referenceId: string;
  kind: WorkLogKind;
  detail: Record<string, unknown>;
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Avoid exposing full SOP payload in admin feed (can be large / sensitive). */
function summarizeSopChecklistResult(raw: string | null | undefined): Record<string, unknown> {
  const s = raw?.trim() ?? "";
  if (!s) return { checklistItemCount: 0 };
  try {
    const v = JSON.parse(s) as unknown;
    if (Array.isArray(v)) {
      let completed = 0;
      for (const x of v) {
        if (x && typeof x === "object" && (x as { checked?: boolean }).checked === true) completed++;
      }
      return { checklistItemCount: v.length, checklistCompletedCount: completed };
    }
    if (v && typeof v === "object") {
      const keys = Object.keys(v as object);
      return { checklistItemCount: keys.length, checklistShape: "object" };
    }
    return { checklistItemCount: 0, checklistPrimitiveType: typeof v };
  } catch {
    return { checklistItemCount: 0, checklistParseError: true, checklistResultCharLength: s.length };
  }
}

export type BuildWorkLogFeedOptions = {
  /** YYYY-MM-DD; when set, only entries for this staff business date (work-day window). */
  businessDate?: string | null;
};

export async function buildWorkLogFeed(
  prisma: PrismaClient,
  filter: WorkLogKind = "all",
  takePerSource = 400,
  options?: BuildWorkLogFeedOptions
): Promise<WorkLogEntry[]> {
  const entries: WorkLogEntry[] = [];
  const rollover = await getWorkDayRolloverMinutesFromDb(prisma);
  const bdKey = (d: Date) => staffBusinessDateKeyWithRollover(d, rollover);
  const bdFilter = options?.businessDate?.trim() || null;
  const range = bdFilter ? utcRangeForStaffBusinessDateKey(bdFilter, rollover) : null;

  const want = (k: WorkLogKind) => filter === "all" || filter === k;

  if (want("attendance")) {
    const rows = await prisma.syncedStaffAttendance.findMany({
      where: range ? { happenedAt: { gte: range.start, lt: range.end } } : undefined,
      orderBy: { happenedAt: "desc" },
      take: takePerSource,
    });
    for (const r of rows) {
      const iso = r.happenedAt.toISOString();
      const bd = bdKey(r.happenedAt);
      const title = r.eventType === "TIME_IN" ? "Time In" : "Time Out";
      entries.push({
        id: `att-${r.id}`,
        storeId: r.storeId,
        businessDate: bd,
        actionType: title,
        actorName: r.staffName,
        actorStaffCloudId: r.staffCloudId ?? null,
        occurredAt: iso,
        summary: `${r.staffRole} • ${fmtTime(iso)}`,
        referenceType: "syncedStaffAttendance",
        referenceId: r.id,
        kind: "attendance",
        detail: {
          eventType: r.eventType,
          staffName: r.staffName,
          staffRole: r.staffRole,
          staffCloudId: r.staffCloudId,
          happenedAt: iso,
          businessDate: bd,
          selfieUrl: r.selfieUrl,
        },
      });
    }
  }

  if (want("inventory")) {
    const rows = await prisma.syncedInventoryCountSession.findMany({
      where: bdFilter
        ? {
            OR: [
              { businessDate: bdFilter },
              { businessDate: null, countedAt: { gte: range!.start, lt: range!.end } },
            ],
          }
        : undefined,
      orderBy: { countedAt: "desc" },
      take: takePerSource,
      include: { lines: true },
    });
    for (const r of rows) {
      const iso = r.countedAt.toISOString();
      const bd = r.businessDate?.trim() || bdKey(r.countedAt);
      entries.push({
        id: `inv-${r.id}`,
        storeId: r.storeId,
        businessDate: bd,
        actionType: "Manual Inventory Count",
        actorName: r.submittedByStaffName,
        actorStaffCloudId: r.submittedByStaffCloudId ?? null,
        occurredAt: iso,
        summary: `${r.shiftType ?? "—"} shift • ${r.lines.length} line(s)`,
        referenceType: "syncedInventoryCountSession",
        referenceId: r.id,
        kind: "inventory",
        detail: {
          submittedByStaffName: r.submittedByStaffName,
          submittedByStaffCloudId: r.submittedByStaffCloudId,
          submittedByLocalStaffId: r.submittedByLocalStaffId,
          timeSubmitted: iso,
          shiftType: r.shiftType,
          businessDate: bd,
          source: r.source,
          auditSource: "staff_manual_inventory",
          lines: r.lines.map((l) => ({
            inventoryItemName: l.inventoryItemName,
            inventoryItemCloudId: l.inventoryItemCloudId,
            actualQuantity: l.actualQuantity,
            unit: l.unit,
            expectedQuantity: l.expectedQuantity,
            varianceQuantity: l.varianceQuantity,
          })),
        },
      });
    }
  }

  if (want("waste")) {
    const rows = await prisma.syncedWasteReport.findMany({
      where: range ? { happenedAt: { gte: range.start, lt: range.end } } : undefined,
      orderBy: { happenedAt: "desc" },
      take: takePerSource,
    });
    for (const r of rows) {
      const iso = r.happenedAt.toISOString();
      const bd = bdKey(r.happenedAt);
      entries.push({
        id: `waste-${r.id}`,
        storeId: r.storeId,
        businessDate: bd,
        actionType: "Waste Report",
        actorName: r.staffName,
        actorStaffCloudId: r.staffCloudId ?? null,
        occurredAt: iso,
        summary: `${r.inventoryItemName} • ${r.quantity}${r.unit ? ` ${r.unit}` : ""}`,
        referenceType: "syncedWasteReport",
        referenceId: r.id,
        kind: "waste",
        detail: {
          staffName: r.staffName,
          staffCloudId: r.staffCloudId,
          itemType: r.itemType,
          inventoryItemName: r.inventoryItemName,
          quantity: r.quantity,
          unit: r.unit,
          reason: r.reason,
          notes: r.notes,
          happenedAt: iso,
          businessDate: bd,
          imageUrl: r.imageUrl,
        },
      });
    }
  }

  if (want("sop")) {
    const rows = await prisma.syncedSopChecklistSubmission.findMany({
      where: range ? { submittedAt: { gte: range.start, lt: range.end } } : undefined,
      orderBy: { submittedAt: "desc" },
      take: takePerSource,
    });
    for (const r of rows) {
      const iso = r.submittedAt.toISOString();
      const bd = bdKey(r.submittedAt);
      entries.push({
        id: `sop-${r.id}`,
        storeId: r.storeId,
        businessDate: bd,
        actionType: "SOP Checklist Submitted",
        actorName: r.submittedByStaffName,
        actorStaffCloudId: r.submittedByStaffCloudId ?? null,
        occurredAt: iso,
        summary: `${r.templateName} • ${r.shiftType}`,
        referenceType: "syncedSopChecklistSubmission",
        referenceId: r.id,
        kind: "sop",
        detail: {
          templateName: r.templateName,
          templateVersion: r.templateVersion,
          shiftType: r.shiftType,
          checklistSummary: summarizeSopChecklistResult(r.checklistResultJson),
          notes: r.notes,
          submittedAt: iso,
          businessDate: bd,
          assignedShiftId: r.assignedShiftId,
        },
      });
    }
  }

  if (want("shifts")) {
    const rows = await prisma.cloudStaffShiftAssignment.findMany({
      where: range ? { shiftDate: { gte: range.start, lt: range.end } } : undefined,
      orderBy: { shiftDate: "desc" },
      take: takePerSource,
    });
    for (const r of rows) {
      const iso = r.createdAt.toISOString();
      const bd = bdKey(r.shiftDate);
      entries.push({
        id: `shift-${r.id}`,
        storeId: r.storeId,
        businessDate: bd,
        actionType: "Shift Assigned",
        actorName: r.assignedBy?.trim() ? String(r.assignedBy) : r.staffName,
        actorStaffCloudId: r.staffCloudId,
        occurredAt: iso,
        summary: `Assignee: ${r.staffName} • ${r.shiftType} • ${r.shiftDate.toISOString().slice(0, 10)}`,
        referenceType: "cloudStaffShiftAssignment",
        referenceId: r.id,
        kind: "shifts",
        detail: {
          staffName: r.staffName,
          staffCloudId: r.staffCloudId,
          role: r.role,
          shiftDate: r.shiftDate.toISOString(),
          startTimeText: r.startTimeText,
          endTimeText: r.endTimeText,
          shiftType: r.shiftType,
          assignedBy: r.assignedBy,
          status: r.status,
          businessDate: bd,
        },
      });
    }
  }

  if (want("violations")) {
    /* No synced violation entity yet — reserved for unified stream */
  }

  /** Staff-attributed ledger rows from POS sync (store/warehouse add). WH→store pullout uses TRANSFER and is not included here. */
  if (want("stock_movements")) {
    const rows = await prisma.stockMovement.findMany({
      where: {
        ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
        sourceType: { startsWith: "STAFF_POS_" },
      },
      orderBy: { createdAt: "desc" },
      take: takePerSource,
      include: {
        ingredient: { select: { id: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    });
    const actorIds: string[] = [
      ...new Set(
        rows
          .map((r) => (typeof r.actorStaffId === "string" ? r.actorStaffId.trim() : ""))
          .filter((id): id is string => id.length > 0)
      ),
    ];
    const staffById =
      actorIds.length > 0
        ? new Map(
            (
              await prisma.staff.findMany({
                where: { id: { in: actorIds } },
                select: { id: true, name: true },
              })
            ).map((s) => [s.id, s.name] as const)
          )
        : new Map<string, string>();

    for (const r of rows) {
      const iso = r.createdAt.toISOString();
      const bd = bdKey(r.createdAt);
      const kindLabel =
        r.sourceType === "STAFF_POS_STORE_ADD"
          ? "Add to store"
          : r.sourceType === "STAFF_POS_WAREHOUSE_ADD"
            ? "Add to warehouse"
            : "Stock movement";
      const qty = Number(r.quantityDeltaBaseUnit);
      const aid = r.actorStaffId?.trim() || null;
      const actorName = aid ? staffById.get(aid) ?? "—" : "—";
      entries.push({
        id: `stk-${r.id}`,
        storeId: "store_1",
        businessDate: bd,
        actionType: kindLabel,
        actorName,
        actorStaffCloudId: aid,
        occurredAt: iso,
        summary: `${r.ingredient.name} • ${qty >= 0 ? "+" : ""}${qty} @ ${r.location.code}`,
        referenceType: "stockMovement",
        referenceId: r.id,
        kind: "stock_movements",
        detail: {
          sourceType: r.sourceType,
          sourceId: r.sourceId,
          movementType: r.movementType,
          quantityDeltaBaseUnit: String(r.quantityDeltaBaseUnit),
          ingredientId: r.ingredient.id,
          ingredientName: r.ingredient.name,
          locationCode: r.location.code,
          locationName: r.location.name,
          notes: r.notes,
          actorStaffId: aid,
          createdAt: iso,
          businessDate: bd,
        },
      });
    }
  }

  entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return entries;
}
