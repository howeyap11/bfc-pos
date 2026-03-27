import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { enqueueOutbox } from "../services/outbox.service";
import { canAuditStaffOps, canManageStaffOps } from "../lib/staffRoles";
import { decodeBase64Image, saveStaffMedia, toRelativeStaffMediaPath } from "../services/localStaffMedia.service";
import { requireStaffHook } from "../plugins/staffGuard";

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
        inventoryItemName: z.string().min(1),
        quantity: z.string().min(1),
        unit: z.string().optional(),
        reason: z.string().min(1),
        notes: z.string().optional(),
        imageBase64: z.string().min(1),
        happenedAt: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const decoded = decodeBase64Image(parsed.data.imageBase64);
    const filePath = await saveStaffMedia({
      folder: "waste",
      fileName: `${staff.id}-waste.${decoded.ext}`,
      bytes: decoded.bytes,
    });
    const row = await app.prisma.wasteReport.create({
      data: {
        storeId: getStoreId(req as StaffReq),
        staffCloudId: staff.cloudId,
        staffName: staff.name,
        itemType: parsed.data.itemType,
        inventoryItemCloudId: parsed.data.inventoryItemCloudId ?? null,
        inventoryItemName: parsed.data.inventoryItemName,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit ?? null,
        reason: parsed.data.reason,
        notes: parsed.data.notes ?? null,
        imageLocalPath: toRelativeStaffMediaPath(filePath),
        happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date(),
      },
    });
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

  app.post("/staff/inventory-count-sessions", async (req, reply) => {
    const staff = ensureStaff(req as StaffReq, reply);
    if (!staff) return;
    const parsed = z
      .object({
        source: z.enum(["STAFF_UI", "POS"]).default("STAFF_UI"),
        notes: z.string().optional(),
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

    const session = await app.prisma.staffInventoryCountSession.create({
      data: {
        storeId: getStoreId(req as StaffReq),
        submittedByStaffCloudId: staff.cloudId,
        submittedByStaffName: staff.name,
        source: parsed.data.source,
        notes: parsed.data.notes ?? null,
        countedAt: parsed.data.countedAt ? new Date(parsed.data.countedAt) : new Date(),
        lines: {
          create: parsed.data.lines.map((l) => ({
            inventoryItemCloudId: l.inventoryItemCloudId,
            inventoryItemName: l.inventoryItemName,
            expectedQuantity: l.expectedQuantity ?? null,
            actualQuantity: l.actualQuantity,
            varianceQuantity: l.varianceQuantity ?? null,
            unit: l.unit ?? null,
            notes: l.notes ?? null,
          })),
        },
      },
      include: { lines: true },
    });
    await enqueueOutbox(app.prisma, {
      storeId: session.storeId,
      topic: "staffops.inventory-count.sync",
      payload: { localId: session.id },
    });
    return { ok: true, session };
  });

  app.get("/staff/inventory-count-sessions", async (req, reply) => {
    if (!requireManagerOrAuditor(req as StaffReq, reply)) return;
    return app.prisma.staffInventoryCountSession.findMany({
      where: { storeId: getStoreId(req as StaffReq) },
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
}
