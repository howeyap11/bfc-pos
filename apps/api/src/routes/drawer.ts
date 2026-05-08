// apps/api/src/routes/drawer.ts
import type { FastifyInstance } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";
import { openCashDrawerUsingConfiguredReceiptPrinter } from "../services/print.service.js";

const STORE_ID = "store_1";

export async function drawerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaffHook);

  // Open drawer
  app.post("/drawer/open", async (req, reply) => {
    const body = req.body as {
      reason: "GIVE_CHANGE" | "EXCHANGE_BILLS" | "CASH_DROP" | "OTHER";
      note?: string;
    };

    if (!body?.reason) {
      reply.code(400);
      return { error: "MISSING_REASON" };
    }

    const validReasons = ["GIVE_CHANGE", "EXCHANGE_BILLS", "CASH_DROP", "OTHER"];
    if (!validReasons.includes(body.reason)) {
      reply.code(400);
      return { error: "INVALID_REASON" };
    }

    const staff = (req as { staff?: { id: string; name: string } }).staff;

    const auditLog = await app.prisma.auditLog.create({
      data: {
        storeId: STORE_ID,
        action: "DRAWER_OPEN",
        entity: "Drawer",
        entityId: null,
        actorId: staff?.id ?? null,
        note: body.note?.trim() || null,
        metaJson: JSON.stringify({
          reason: body.reason,
          staffName: staff?.name ?? null,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    try {
      await openCashDrawerUsingConfiguredReceiptPrinter();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Drawer hardware failed");
      app.log.warn({ err, auditLogId: auditLog.id }, "Cash drawer pulse failed after DRAWER_OPEN audit");
      reply.code(500);
      return { error: "DRAWER_OPEN_FAILED", message, auditLogId: auditLog.id };
    }

    return {
      ok: true,
      message: "Drawer opened",
      auditLogId: auditLog.id,
    };
  });
}
