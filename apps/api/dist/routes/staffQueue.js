import { z } from "zod";
const QueueQuery = z.object({
    area: z.enum(["BAR", "KITCHEN"]),
});
const ACTIVE_STATUSES = ["PLACED", "IN_PREP", "READY"];
export const staffQueueRoutes = async (app) => {
    app.get("/queue", { preHandler: app.requireStaff }, async (req, reply) => {
        const parsed = QueueQuery.safeParse(req.query);
        if (!parsed.success) {
            return reply.code(400).send({ error: "INVALID_QUERY", details: parsed.error.flatten() });
        }
        const { area } = parsed.data;
        const where = {
            status: { in: [...ACTIVE_STATUSES] },
        };
        if (area === "KITCHEN") {
            where.items = {
                some: { item: { category: { prepArea: "KITCHEN" } } },
            };
        }
        const orders = await app.prisma.order.findMany({
            where,
            orderBy: { createdAt: "asc" },
            include: {
                table: { include: { zone: true } },
                items: {
                    ...(area === "KITCHEN"
                        ? { where: { item: { category: { prepArea: "KITCHEN" } } } }
                        : {}),
                    include: {
                        item: { include: { category: true } },
                        options: { include: { option: { include: { group: true } } } },
                    },
                },
            },
        });
        // Keep response compact + stable for Flutter
        return orders.map((o) => ({
            id: o.id,
            orderNo: o.orderNo,
            status: o.status,
            source: o.source,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            tabId: o.tabId,
            externalRef: o.externalRef,
            customerNote: o.customerNote,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            table: {
                id: o.table.id,
                label: o.table.label,
                publicKey: o.table.publicKey,
                zone: {
                    code: o.table.zone.code,
                    name: o.table.zone.name,
                },
            },
            items: o.items.map((oi) => ({
                id: oi.id,
                qty: oi.qty,
                unitPrice: oi.unitPrice,
                lineNote: oi.lineNote,
                item: {
                    id: oi.item.id,
                    name: oi.item.name,
                    category: {
                        name: oi.item.category.name,
                        prepArea: oi.item.category.prepArea,
                    },
                },
                options: oi.options.map((sel) => ({
                    id: sel.id,
                    priceDelta: sel.priceDelta,
                    option: {
                        id: sel.option.id,
                        name: sel.option.name,
                        group: { id: sel.option.group.id, name: sel.option.group.name },
                    },
                })),
            })),
        }));
    });
};
