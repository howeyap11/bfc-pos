import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { enqueueOutbox } from "../services/outbox.service";
import { canAuditStaffOps, canManageStaffOps, canRecordWarehousePullout } from "../lib/staffRoles";
import {
  DEFAULT_WORK_DAY_CUTOVER_MINUTES,
  parseWorkDayCutoverMinutes,
  staffBusinessDateKeyWithCutover,
} from "../lib/staffBusinessDate";
import Decimal from "decimal.js";
import { resolveManualInventoryShiftType } from "../lib/manualInventoryShiftType";
import { buildManualInventorySubmitSnapshot } from "../lib/manualInventorySnapshot";
import { decodeBase64Image, saveStaffMedia, toRelativeStaffMediaPath } from "../services/localStaffMedia.service";
import { requireStaffHook } from "../plugins/staffGuard";

const STAFF_MEDIA_ABS_ROOT = path.resolve(process.cwd(), "storage", "staff-media");

const STORE_ID = "store_1";

type StaffReq = FastifyRequest & {
  staff?: { id: string; cloudId?: string | null; name: string; role: string; storeId?: string };
};

function requireManagerOrAuditor(req: StaffReq, reply: FastifyReply): boolean {
  const role = req.staff?.role ?? "";
  if (canManageStaffOps(role) || canAuditStaffOps(role)) return true;
  reply.code(403).send({ error: "FORBIDDEN", message: "Manager/auditor permission required." });
  return false;
}

function requireWarehousePulloutRole(req: StaffReq, reply: FastifyReply): boolean {
  const role = req.staff?.role ?? "";
  if (canRecordWarehousePullout(role)) return true;
  reply.code(403).send({ error: "FORBIDDEN", message: "Warehouse pullout is not allowed for this role." });
  return false;
}

function getStoreId(req: StaffReq): string {
  return req.staff?.storeId ?? STORE_ID;
}

function ensureStaff(req: StaffReq, reply: FastifyReply): { id: string; cloudId: string | null; name: string; role: string } | null {
  if (!req.staff) {
    reply.code(401).send({ error: "UNAUTHORIZED" });
    return null;
  }
  return {
    id: req.staff.id,
    cloudId: req.staff.cloudId ?? null,
    name: req.staff.name,
    role: req.staff.role,
  };
}

export async function staffOpsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaffHook);

  /** Synced cloud ingredients (local cache) for waste / counts — no free-text inventory IDs */
  app.get("/staff/inventory/ingredients", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const storeId = getStoreId(req as StaffReq);
    const rows = await app.prisma.cloudIngredient.findMany({
      where: { storeId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { cloudId: true, name: true, unitCode: true, imageUrl: true },
    });
    return rows.map((r) => ({
      cloudId: r.cloudId,
      name: r.name,
      unitCode: r.unitCode,
      imageUrl: r.imageUrl ?? null,
    }));
  });

  app.post("/staff/attendance/time-in", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z.object({ imageBase64: z.string().min(1), happenedAt: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const happenedAt = parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date();
    const decoded = decodeBase64Image(parsed.data.imageBase64);
    const filePath = await saveStaffMedia({
      folder: "attendance",
      fileName: `${staff.id}-time-in.${decoded.ext}`,
      bytes: decoded.bytes,
    });
    const row = await app.prisma.staffAttendanceEvent.create({
      data: {
        storeId: getStoreId(req as StaffReq),
        staffCloudId: staff.cloudId,
        staffName: staff.name,
        staffRole: staff.role,
        eventType: "TIME_IN",
        happenedAt,
        selfieLocalPath: toRelativeStaffMediaPath(filePath),
      },
    });
    await enqueueOutbox(app.prisma, {
      storeId: row.storeId,
      topic: "staffops.attendance.sync",
      payload: { localId: row.id },
    });
    return { ok: true, event: row };
  });

  app.post("/staff/attendance/time-out", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z.object({ imageBase64: z.string().min(1), happenedAt: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const happenedAt = parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date();
    const decoded = decodeBase64Image(parsed.data.imageBase64);
    const filePath = await saveStaffMedia({
      folder: "attendance",
      fileName: `${staff.id}-time-out.${decoded.ext}`,
      bytes: decoded.bytes,
    });
    const row = await app.prisma.staffAttendanceEvent.create({
      data: {
        storeId: getStoreId(req as StaffReq),
        staffCloudId: staff.cloudId,
        staffName: staff.name,
        staffRole: staff.role,
        eventType: "TIME_OUT",
        happenedAt,
        selfieLocalPath: toRelativeStaffMediaPath(filePath),
      },
    });
    await enqueueOutbox(app.prisma, {
      storeId: row.storeId,
      topic: "staffops.attendance.sync",
      payload: { localId: row.id },
    });
    return { ok: true, event: row };
  });

  app.get("/staff/attendance/me/today", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return app.prisma.staffAttendanceEvent.findMany({
      where: {
        storeId: getStoreId(req as StaffReq),
        staffName: staff.name,
        happenedAt: { gte: start, lt: end },
      },
      orderBy: { happenedAt: "asc" },
    });
  });

  /** Serve local attendance selfie file for the signed-in staff member only. */
  app.get("/staff/attendance/event/:eventId/selfie", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const { eventId } = req.params as { eventId: string };
    const storeId = getStoreId(req as StaffReq);
    const row = await app.prisma.staffAttendanceEvent.findFirst({
      where: {
        id: eventId,
        storeId,
        staffName: staff.name,
        selfieLocalPath: { not: null },
      },
      select: { selfieLocalPath: true },
    });
    if (!row?.selfieLocalPath) return reply.code(404).send({ error: "NOT_FOUND" });
    const rel = row.selfieLocalPath.replace(/^\.\//, "");
    const abs = path.resolve(process.cwd(), rel);
    if (!abs.startsWith(STAFF_MEDIA_ABS_ROOT)) {
      return reply.code(403).send({ error: "INVALID_PATH" });
    }
    try {
      const buf = await readFile(abs);
      const ext = path.extname(abs).toLowerCase();
      const mime =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
      return reply.type(mime).send(buf);
    } catch {
      return reply.code(404).send({ error: "FILE_MISSING" });
    }
  });

  app.get("/staff/attendance/store/today", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return app.prisma.staffAttendanceEvent.findMany({
      where: { storeId: getStoreId(req as StaffReq), happenedAt: { gte: start, lt: end } },
      orderBy: { happenedAt: "desc" },
    });
  });

  app.post("/staff/waste-reports", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z
      .object({
        itemType: z.enum(["INVENTORY_ITEM", "MENU_ITEM", "OTHER"]),
        inventoryItemCloudId: z.string().optional(),
        inventoryItemName: z.string().optional(),
        quantity: z.string().min(1),
        unit: z.string().optional(),
        reason: z.string().min(1),
        notes: z.string().optional(),
        imageBase64: z.string().min(1),
        happenedAt: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const storeId = getStoreId(req as StaffReq);
    let inventoryItemName = (parsed.data.inventoryItemName ?? "").trim();
    let inventoryItemCloudId = (parsed.data.inventoryItemCloudId ?? "").trim();
    let unitOut: string | null = parsed.data.unit ?? null;
    if (parsed.data.itemType === "INVENTORY_ITEM") {
      if (!inventoryItemCloudId) {
        return reply.code(400).send({ error: "MISSING_INVENTORY_ITEM", message: "Select an item from synced inventory." });
      }
      const ing = await app.prisma.cloudIngredient.findFirst({
        where: { storeId, cloudId: inventoryItemCloudId, deletedAt: null, isActive: true },
      });
      if (!ing) {
        return reply.code(400).send({ error: "INVALID_INVENTORY_ITEM", message: "Item not in local synced inventory." });
      }
      inventoryItemName = ing.name;
      unitOut = ing.unitCode;
    } else {
      if (!inventoryItemName) {
        return reply.code(400).send({ error: "INVALID_BODY", message: "inventoryItemName required for this item type." });
      }
    }
    const decoded = decodeBase64Image(parsed.data.imageBase64);
    const filePath = await saveStaffMedia({
      folder: "waste",
      fileName: `${staff.id}-waste.${decoded.ext}`,
      bytes: decoded.bytes,
    });
    const row = await app.prisma.wasteReport.create({
      data: {
        storeId,
        staffCloudId: staff.cloudId,
        staffName: staff.name,
        itemType: parsed.data.itemType,
        inventoryItemCloudId: inventoryItemCloudId || null,
        inventoryItemName,
        quantity: parsed.data.quantity,
        unit: unitOut,
        reason: parsed.data.reason,
        notes: parsed.data.notes ?? null,
        imageLocalPath: toRelativeStaffMediaPath(filePath),
        happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date(),
      },
    });
    if (parsed.data.itemType === "INVENTORY_ITEM" && inventoryItemCloudId) {
      try {
        await app.inventoryService.applyWasteReportDeduction({
          storeId,
          wasteReportId: row.id,
          inventoryItemCloudId,
          quantityStr: parsed.data.quantity,
          createdByStaffId: staff.id,
        });
      } catch (err) {
        app.log.warn({ err, wasteReportId: row.id }, "[INVENTORY] Waste deduction skipped or failed");
      }
    }
    await enqueueOutbox(app.prisma, {
      storeId: row.storeId,
      topic: "staffops.waste.sync",
      payload: { localId: row.id },
    });
    return { ok: true, report: row };
  });

  app.get("/staff/waste-reports", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    const q = req.query as { start?: string; end?: string; staff?: string };
    return app.prisma.wasteReport.findMany({
      where: {
        storeId: getStoreId(req as StaffReq),
        ...(q.staff ? { staffName: q.staff } : {}),
        happenedAt:
          q.start || q.end
            ? {
                ...(q.start ? { gte: new Date(q.start) } : {}),
                ...(q.end ? { lte: new Date(q.end) } : {}),
              }
            : undefined,
      },
      orderBy: { happenedAt: "desc" },
      take: 200,
    });
  });

  /**
   * Manual inventory count (staff phone / POS):
   * - snapshotJson frozen locally at submit (see manualInventorySnapshot.ts); not computed from cloud.
   * - Effective slot: one non-superseded row per storeId + businessDate + shiftType; resubmit marks prior superseded (revision chain).
   * - Outbox: staffops.inventory-count.sync → cloud receives same frozen snapshotJson.
   */
  app.post("/staff/inventory-count-sessions", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z
      .object({
        source: z.enum(["STAFF_UI", "POS"]).default("STAFF_UI"),
        countedAt: z.string().optional(),
        lines: z
          .array(
            z.object({
              inventoryItemCloudId: z.string().min(1),
              inventoryItemName: z.string().min(1),
              expectedQuantity: z.string().optional(),
              actualQuantity: z.string().min(1),
              varianceQuantity: z.string().optional(),
              unit: z.string().optional(),
              notes: z.string().optional(),
            })
          )
          .min(1),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });

    const storeId = getStoreId(req as StaffReq);
    const countedAt = parsed.data.countedAt ? new Date(parsed.data.countedAt) : new Date();
    const setting = await app.prisma.cloudStoreSetting.findUnique({ where: { id: "1" } });
    const cutoverMinutes =
      parseWorkDayCutoverMinutes(setting?.workDayFromTimeLocal) ?? DEFAULT_WORK_DAY_CUTOVER_MINUTES;
    const toMinutes = parseWorkDayCutoverMinutes(setting?.workDayToTimeLocal);
    const workEndMinutesFromMidnight =
      toMinutes != null && toMinutes > cutoverMinutes && toMinutes <= 1440 ? toMinutes : undefined;
    const businessDate = staffBusinessDateKeyWithCutover(countedAt, cutoverMinutes);

    const assignments =
      staff.cloudId != null && staff.cloudId !== ""
        ? await app.prisma.staffShiftLocal.findMany({
            where: { storeId, staffCloudId: staff.cloudId },
            orderBy: { shiftDate: "desc" },
            take: 40,
            select: { shiftDate: true, shiftType: true },
          })
        : [];

    const shiftType = resolveManualInventoryShiftType({
      submittedAt: countedAt,
      assignments,
      cutoverMinutesFromMidnight: cutoverMinutes,
      workEndMinutesFromMidnight,
    });

    let replacedSessionId: string | null = null;
    const session = await app.prisma.$transaction(async (tx) => {
      const previousEffective = await tx.staffInventoryCountSession.findFirst({
        where: { storeId, businessDate, shiftType, supersededAt: null },
        orderBy: { countedAt: "desc" },
      });
      replacedSessionId = previousEffective?.id ?? null;

      const { snapshotJson, expectedStoreByCloudId } = await buildManualInventorySubmitSnapshot(
        tx,
        storeId,
        parsed.data.lines.map((l) => ({
          inventoryItemCloudId: l.inventoryItemCloudId,
          actualQuantity: l.actualQuantity,
        })),
        {
          submittedAtIso: countedAt.toISOString(),
          businessDate,
          shiftType,
          submittedByStaffCloudId: staff.cloudId,
          submittedByLocalStaffId: staff.id,
          submittedByStaffName: staff.name,
          replacesSessionId: replacedSessionId,
        },
        { snapshotWarn: (meta, msg) => app.log.warn(meta, msg) }
      );

      const lineRows = parsed.data.lines.map((l) => {
        const cid = l.inventoryItemCloudId.trim();
        const frozenExpected = cid ? expectedStoreByCloudId.get(cid) : undefined;
        const expectedQuantity = frozenExpected ?? null;
        if (cid && frozenExpected === undefined) {
          app.log.warn(
            { event: "MANUAL_COUNT_SNAPSHOT_KEY_MISS", storeId, inventoryItemCloudId: cid, businessDate, shiftType },
            "[INVENTORY] Count line cloud id missing from frozen snapshot map"
          );
        }
        let varianceQuantity: string | null = l.varianceQuantity ?? null;
        if (expectedQuantity != null) {
          try {
            varianceQuantity = new Decimal(l.actualQuantity).minus(new Decimal(expectedQuantity)).toString();
          } catch {
            /* keep client variance if any */
          }
        }
        return {
          inventoryItemCloudId: l.inventoryItemCloudId,
          inventoryItemName: l.inventoryItemName,
          expectedQuantity,
          actualQuantity: l.actualQuantity,
          varianceQuantity,
          unit: l.unit ?? null,
          notes: l.notes ?? null,
        };
      });

      const created = await tx.staffInventoryCountSession.create({
        data: {
          storeId,
          submittedByStaffCloudId: staff.cloudId,
          submittedByLocalStaffId: staff.id,
          submittedByStaffName: staff.name,
          source: parsed.data.source,
          notes: null,
          shiftType,
          businessDate,
          countedAt,
          snapshotJson,
          replacesSessionId: replacedSessionId,
          lines: { create: lineRows },
        },
        include: { lines: true },
      });

      if (previousEffective) {
        await tx.staffInventoryCountSession.update({
          where: { id: previousEffective.id },
          data: { supersededAt: countedAt, supersededBySessionId: created.id },
        });
        const pending = await tx.localOutbox.findMany({
          where: { storeId, topic: "staffops.inventory-count.sync", status: "PENDING" },
        });
        for (const ob of pending) {
          try {
            const p = JSON.parse(ob.payloadJson) as { localId?: string };
            if (p.localId === previousEffective.id) {
              await tx.localOutbox.delete({ where: { id: ob.id } });
            }
          } catch {
            /* ignore malformed */
          }
        }
      }

      return created;
    });

    await enqueueOutbox(app.prisma, {
      storeId: session.storeId,
      topic: "staffops.inventory-count.sync",
      payload: { localId: session.id },
    });

    return {
      ok: true,
      session,
      /** Explicit overwrite model: revision chain — prior effective row is superseded, not deleted. */
      overwriteMode: replacedSessionId ? ("superseded_previous_effective" as const) : ("new_effective" as const),
      replacedSessionId,
    };
  });

  app.get("/staff/inventory-count-sessions", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    const q = req.query as { effectiveOnly?: string };
    const effectiveOnly = q.effectiveOnly === "1" || q.effectiveOnly === "true";
    return app.prisma.staffInventoryCountSession.findMany({
      where: {
        storeId: getStoreId(req as StaffReq),
        ...(effectiveOnly ? { supersededAt: null } : {}),
      },
      orderBy: { countedAt: "desc" },
      include: { lines: true },
      take: 100,
    });
  });

  app.get("/staff/inventory-count-sessions/:id", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    const { id } = req.params as { id: string };
    const row = await app.prisma.staffInventoryCountSession.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!row) return reply.code(404).send({ error: "NOT_FOUND" });
    return row;
  });

  app.get("/staff/sop/templates/active", async () => {
    return app.prisma.sopChecklistTemplateLocal.findMany({
      where: { isActive: true },
      orderBy: [{ shiftType: "asc" }, { name: "asc" }],
    });
  });

  app.post("/staff/sop/submissions", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z
      .object({
        templateCloudId: z.string().optional(),
        templateName: z.string().min(1),
        templateVersion: z.number().int().default(1),
        shiftType: z.string().min(1),
        assignedShiftId: z.string().optional(),
        checklistResultJson: z.string().min(2),
        notes: z.string().optional(),
        submittedAt: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });

    const row = await app.prisma.sopChecklistSubmission.create({
      data: {
        storeId: getStoreId(req as StaffReq),
        templateCloudId: parsed.data.templateCloudId ?? null,
        templateName: parsed.data.templateName,
        templateVersion: parsed.data.templateVersion,
        shiftType: parsed.data.shiftType,
        submittedByStaffCloudId: staff.cloudId,
        submittedByStaffName: staff.name,
        assignedShiftId: parsed.data.assignedShiftId ?? null,
        checklistResultJson: parsed.data.checklistResultJson,
        notes: parsed.data.notes ?? null,
        submittedAt: parsed.data.submittedAt ? new Date(parsed.data.submittedAt) : new Date(),
      },
    });
    await enqueueOutbox(app.prisma, {
      storeId: row.storeId,
      topic: "staffops.sop.sync",
      payload: { localId: row.id },
    });
    return { ok: true, submission: row };
  });

  app.get("/staff/sop/submissions", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    return app.prisma.sopChecklistSubmission.findMany({
      where: { storeId: getStoreId(req as StaffReq) },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });
  });

  app.get("/staff/shifts/me", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    return app.prisma.staffShiftLocal.findMany({
      where: { storeId: getStoreId(req as StaffReq), staffName: staff.name },
      orderBy: { shiftDate: "asc" },
      take: 30,
    });
  });

  app.get("/staff/shifts/store", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    return app.prisma.staffShiftLocal.findMany({
      where: { storeId: getStoreId(req as StaffReq) },
      orderBy: [{ shiftDate: "asc" }, { startTimeText: "asc" }],
      take: 200,
    });
  });

  app.post("/staff/manager/shifts", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    // Cloud-authored assignments are canonical; local create intentionally deferred in first pass.
    reply.code(202);
    return { ok: false, deferred: true, message: "Shift authoring is cloud-canonical. Local POST is deferred." };
  });

  app.get("/staff/incentives/me", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    return app.prisma.staffIncentiveLedgerLocal.findMany({
      where: { storeId: getStoreId(req as StaffReq), staffName: staff.name },
      orderBy: { happenedAt: "desc" },
      take: 100,
    });
  });

  app.get("/staff/incentives/staff/:staffCloudId", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    const { staffCloudId } = req.params as { staffCloudId: string };
    return app.prisma.staffIncentiveLedgerLocal.findMany({
      where: { storeId: getStoreId(req as StaffReq), staffCloudId },
      orderBy: { happenedAt: "desc" },
      take: 200,
    });
  });

  app.get("/staff/manager/overview", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    const storeId = getStoreId(req as StaffReq);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [attendanceToday, recentWaste, recentCounts, recentSop] = await Promise.all([
      app.prisma.staffAttendanceEvent.count({
        where: { storeId, happenedAt: { gte: todayStart, lte: now } },
      }),
      app.prisma.wasteReport.findMany({
        where: { storeId },
        orderBy: { happenedAt: "desc" },
        take: 5,
      }),
      app.prisma.staffInventoryCountSession.findMany({
        where: { storeId },
        orderBy: { countedAt: "desc" },
        include: { lines: true },
        take: 5,
      }),
      app.prisma.sopChecklistSubmission.findMany({
        where: { storeId },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      attendanceToday,
      recentWaste,
      recentInventoryCounts: recentCounts,
      recentSopSubmissions: recentSop,
    };
  });

  /** Store/warehouse adds: manager or auditor. Warehouse→store pullout: operational roles (see canRecordWarehousePullout). */
  app.post("/staff/inventory/stock-movements", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z
      .object({
        kind: z.enum(["STORE_ADD", "WAREHOUSE_ADD", "WAREHOUSE_PULLOUT"]),
        ingredientCloudId: z.string().min(1),
        quantity: z.string().min(1),
        notes: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    if (parsed.data.kind === "WAREHOUSE_PULLOUT") {
      if (!requireWarehousePulloutRole(req as StaffReq, reply)) return;
    } else if (!requireManagerOrAuditor(req as StaffReq, reply)) {
      return;
    }
    const storeId = getStoreId(req as StaffReq);
    let qty: Decimal;
    try {
      qty = new Decimal(parsed.data.quantity);
    } catch {
      return reply.code(400).send({ error: "INVALID_QUANTITY" });
    }
    if (!qty.isFinite() || qty.lte(0)) {
      return reply.code(400).send({ error: "INVALID_QUANTITY", message: "Quantity must be positive" });
    }
    const cloudIng = await app.prisma.cloudIngredient.findFirst({
      where: { storeId, cloudId: parsed.data.ingredientCloudId, deletedAt: null, isActive: true },
    });
    if (!cloudIng) {
      return reply.code(400).send({ error: "UNKNOWN_INGREDIENT", message: "Ingredient not in synced catalog." });
    }
    const row = await app.prisma.staffStockMovementLocal.create({
      data: {
        storeId,
        movementKind: parsed.data.kind,
        ingredientCloudId: parsed.data.ingredientCloudId,
        quantityBase: qty.toString(),
        notes: parsed.data.notes ?? null,
        submittedByStaffCloudId: staff.cloudId,
        submittedByLocalStaffId: staff.id,
        submittedByStaffName: staff.name,
      },
    });
    try {
      if (parsed.data.kind === "STORE_ADD") {
        await app.inventoryService.staffStoreAdd({
          storeId,
          ingredientCloudId: parsed.data.ingredientCloudId,
          quantityBase: qty,
          refId: row.id,
          notes: parsed.data.notes,
          createdByStaffId: staff.id,
        });
      } else if (parsed.data.kind === "WAREHOUSE_ADD") {
        await app.inventoryService.staffWarehouseAdd({
          storeId,
          ingredientCloudId: parsed.data.ingredientCloudId,
          quantityBase: qty,
          refId: row.id,
          createdByStaffId: staff.id,
        });
      } else {
        await app.inventoryService.staffWarehousePulloutToStore({
          storeId,
          ingredientCloudId: parsed.data.ingredientCloudId,
          quantityBase: qty,
          refId: row.id,
          notes: parsed.data.notes,
          createdByStaffId: staff.id,
        });
      }
    } catch (err) {
      await app.prisma.staffStockMovementLocal.delete({ where: { id: row.id } }).catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({ error: "STOCK_UPDATE_FAILED", message: msg });
    }
    await enqueueOutbox(app.prisma, {
      storeId,
      topic: "staffops.stock-movement.sync",
      payload: { localId: row.id },
    });
    return { ok: true, movement: row };
  });
}
