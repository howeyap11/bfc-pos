import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const Params = z.object({ id: z.string().min(1) });
const Body = z.object({ reason: z.string().trim().min(3).max(240) });

export const orderCancelRoutes: FastifyPluginAsync = async (app) => {
  app.post("/orders/:id/cancel", { preHandler: app.requireStaff }, async (req, reply) => {
    const p = Params.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: "INVALID_PARAMS" });

    const b = Body.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "INVALID_BODY", details: b.error.flatten() });

    const order = await app.prisma.order.findUnique({
      where: { id: p.data.id },
      select: { id: true, orderNo: true, status: true, source: true, paymentStatus: true, customerNote: true },
    });
    if (!order) return reply.code(404).send({ error: "NOT_FOUND" });

    // cancellable only before prep starts
    if (order.status !== "PLACED") {
      return reply.code(409).send({ error: "NOT_CANCELLABLE_AT_THIS_STAGE" });
    }

    // only unpaid can be cancelled by staff
    if (order.paymentStatus !== "UNPAID") {
      return reply.code(409).send({ error: "MANAGER_VOID_REQUIRED" });
    }

    // only QR unpaid + function room can staff-cancel
    if (!["QR_UNPAID", "FUNCTION_ROOM"].includes(order.source)) {
      return reply.code(409).send({ error: "MANAGER_VOID_REQUIRED" });
    }

    const stamp = new Date().toISOString();
    const prefix = order.customerNote ? `${order.customerNote}\n` : "";
    const newNote = `${prefix}[CANCEL ${stamp}] ${b.data.reason}`;

    const updated = await app.prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", customerNote: newNote },
      select: { id: true, orderNo: true, status: true, updatedAt: true },
    });

    return updated;
  });
};