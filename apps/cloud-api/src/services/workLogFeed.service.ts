/**
 * Unified Work Log view model for cloud admin — aggregates synced staff ops rows
 * without replacing underlying tables. businessDate uses 4am staff-audit rule when missing on row.
 */
import type { PrismaClient } from "@prisma/client";
import { staffBusinessDateKey } from "../lib/staffBusinessDate.js";

export type WorkLogKind =
  | "attendance"
  | "inventory"
  | "waste"
  | "sop"
  | "shifts"
  | "violations"
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

export async function buildWorkLogFeed(
  prisma: PrismaClient,
  filter: WorkLogKind = "all",
  takePerSource = 400
): Promise<WorkLogEntry[]> {
  const entries: WorkLogEntry[] = [];

  const want = (k: WorkLogKind) => filter === "all" || filter === k;

  if (want("attendance")) {
    const rows = await prisma.syncedStaffAttendance.findMany({ orderBy: { happenedAt: "desc" }, take: takePerSource });
    for (const r of rows) {
      const iso = r.happenedAt.toISOString();
      const bd = staffBusinessDateKey(r.happenedAt);
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
      orderBy: { countedAt: "desc" },
      take: takePerSource,
      include: { lines: true },
    });
    for (const r of rows) {
      const iso = r.countedAt.toISOString();
      const bd = r.businessDate?.trim() || staffBusinessDateKey(r.countedAt);
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
    const rows = await prisma.syncedWasteReport.findMany({ orderBy: { happenedAt: "desc" }, take: takePerSource });
    for (const r of rows) {
      const iso = r.happenedAt.toISOString();
      const bd = staffBusinessDateKey(r.happenedAt);
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
    const rows = await prisma.syncedSopChecklistSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: takePerSource });
    for (const r of rows) {
      const iso = r.submittedAt.toISOString();
      const bd = staffBusinessDateKey(r.submittedAt);
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
          checklistResultJson: r.checklistResultJson,
          notes: r.notes,
          submittedAt: iso,
          businessDate: bd,
          assignedShiftId: r.assignedShiftId,
        },
      });
    }
  }

  if (want("shifts")) {
    const rows = await prisma.cloudStaffShiftAssignment.findMany({ orderBy: { shiftDate: "desc" }, take: takePerSource });
    for (const r of rows) {
      const iso = r.createdAt.toISOString();
      const bd = staffBusinessDateKey(r.shiftDate);
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

  entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return entries;
}
