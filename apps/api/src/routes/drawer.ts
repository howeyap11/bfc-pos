// apps/api/src/routes/drawer.ts
import type { FastifyInstance } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard";

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

    // In production, this would trigger hardware to open the cash drawer
    // For now, we just log it

    return {
      ok: true,
      message: "Drawer opened",
      auditLogId: auditLog.id,
    };
  });
}
