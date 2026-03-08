import { z } from "zod";
const Params = z.object({ id: z.string().min(1) });
const Body = z.object({
    status: z.enum(["PLACED", "ACCEPTED", "IN_PREP", "READY", "COMPLETED", "CANCELLED"]),
});
export const orderStatusRoutes = async (app) => {
    app.patch("/orders/:id/status", { preHandler: app.requireStaff }, async (req, reply) => {
        const p = Params.safeParse(req.params);
        if (!p.success)
            return reply.code(400).send({ error: "INVALID_PARAMS" });
        const b = Body.safeParse(req.body);
        if (!b.success)
            return reply.code(400).send({ error: "INVALID_BODY", details: b.error.flatten() });
        const updated = await app.prisma.order.update({
            where: { id: p.data.id },
            data: { status: b.data.status },
            select: { id: true, orderNo: true, status: true, updatedAt: true },
        });
        return updated;
    });
};
