import { z } from "zod";
const Params = z.object({ id: z.string().min(1) });
const Body = z.object({ reason: z.string().trim().min(3).max(240) });
export const voidRequestRoutes = async (app) => {
    app.post("/orders/:id/void-request", { preHandler: app.requireStaff }, async (req, reply) => {
        const p = Params.safeParse(req.params);
        if (!p.success)
            return reply.code(400).send({ error: "INVALID_PARAMS" });
        const b = Body.safeParse(req.body);
        if (!b.success)
            return reply.code(400).send({ error: "INVALID_BODY", details: b.error.flatten() });
        const order = await app.prisma.order.findUnique({
            where: { id: p.data.id },
            select: { customerNote: true },
        });
        if (!order)
            return reply.code(404).send({ error: "NOT_FOUND" });
        const stamp = new Date().toISOString();
        const prefix = order.customerNote ? `${order.customerNote}\n` : "";
        const newNote = `${prefix}[VOID REQUEST ${stamp}] ${b.data.reason}`;
        const updated = await app.prisma.order.update({
            where: { id: p.data.id },
            data: {
                status: "CANCELLED", // removes from queue
                customerNote: newNote,
            },
            select: { id: true, orderNo: true, status: true, updatedAt: true },
        });
        return updated;
    });
};
