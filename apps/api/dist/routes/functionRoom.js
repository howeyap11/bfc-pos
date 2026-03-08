import { z } from "zod";
const StartBody = z.object({
    quotaCents: z.number().int().positive().optional(), // default 300000 (₱3000)
    note: z.string().trim().max(240).optional(),
});
export const functionRoomRoutes = async (app) => {
    // Start / Resume Function Room Tab (single active tab for zone FR)
    app.post("/function-room/start", { preHandler: app.requireStaff }, async (req, reply) => {
        const parsed = StartBody.safeParse(req.body ?? {});
        if (!parsed.success) {
            return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
        }
        const frZone = await app.prisma.zone.findUnique({ where: { code: "FR" } });
        if (!frZone)
            return reply.code(400).send({ error: "FR_ZONE_NOT_FOUND" });
        // Find any function room table (we just need a tableId to anchor the tab)
        const frTable = await app.prisma.table.findFirst({
            where: { zoneId: frZone.id, isFunctionRoom: true, isActive: true },
        });
        if (!frTable)
            return reply.code(400).send({ error: "FR_TABLE_NOT_FOUND" });
        // Only ONE open function room tab at a time (anchored to the first FR table)
        const existing = await app.prisma.tab.findFirst({
            where: { status: "OPEN", type: "FUNCTION_ROOM", tableId: frTable.id },
        });
        const tab = existing ??
            (await app.prisma.tab.create({
                data: {
                    type: "FUNCTION_ROOM",
                    status: "OPEN",
                    tableId: frTable.id,
                    quotaCents: parsed.data.quotaCents ?? 300000,
                    note: parsed.data.note ?? null,
                },
            }));
        return reply.send({ tabId: tab.id, status: tab.status, quotaCents: tab.quotaCents, openedAt: tab.openedAt });
    });
    // Active tab + summary
    app.get("/function-room/active", { preHandler: app.requireStaff }, async (req, reply) => {
        const frZone = await app.prisma.zone.findUnique({ where: { code: "FR" } });
        if (!frZone)
            return reply.code(400).send({ error: "FR_ZONE_NOT_FOUND" });
        const frTable = await app.prisma.table.findFirst({
            where: { zoneId: frZone.id, isFunctionRoom: true, isActive: true },
        });
        if (!frTable)
            return reply.code(400).send({ error: "FR_TABLE_NOT_FOUND" });
        const tab = await app.prisma.tab.findFirst({
            where: { status: "OPEN", type: "FUNCTION_ROOM", tableId: frTable.id },
            include: { table: { include: { zone: true } } },
        });
        if (!tab)
            return reply.send({ active: false });
        // Sum spent = all orders under tab EXCEPT cancelled/void_requested
        const orders = await app.prisma.order.findMany({
            where: {
                tabId: tab.id,
                status: { notIn: ["CANCELLED", "VOID_REQUESTED"] },
            },
            include: { items: true },
        });
        const spentCents = orders.reduce((sum, o) => {
            const orderTotal = o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
            return sum + orderTotal;
        }, 0);
        const remainingCents = Math.max(0, tab.quotaCents - spentCents);
        // return FR tables list for UI
        const frTables = await app.prisma.table.findMany({
            where: { zoneId: frZone.id, isFunctionRoom: true, isActive: true },
            select: { id: true, label: true, publicKey: true },
            orderBy: { label: "asc" },
        });
        return reply.send({
            active: true,
            tab: {
                id: tab.id,
                status: tab.status,
                quotaCents: tab.quotaCents,
                openedAt: tab.openedAt,
                note: tab.note,
                anchorTable: { id: tab.table.id, label: tab.table.label },
            },
            frTables,
            spentCents,
            remainingCents,
        });
    });
    // Orders attached to active function room tab
    app.get("/function-room/orders", { preHandler: app.requireStaff }, async (req, reply) => {
        const frZone = await app.prisma.zone.findUnique({ where: { code: "FR" } });
        if (!frZone)
            return reply.code(400).send({ error: "FR_ZONE_NOT_FOUND" });
        const frTable = await app.prisma.table.findFirst({
            where: { zoneId: frZone.id, isFunctionRoom: true, isActive: true },
        });
        if (!frTable)
            return reply.code(400).send({ error: "FR_TABLE_NOT_FOUND" });
        const tab = await app.prisma.tab.findFirst({
            where: { status: "OPEN", type: "FUNCTION_ROOM", tableId: frTable.id },
        });
        if (!tab)
            return reply.send([]);
        const orders = await app.prisma.order.findMany({
            where: { tabId: tab.id },
            orderBy: { createdAt: "asc" },
            include: {
                table: { include: { zone: true } },
                items: {
                    include: {
                        item: { include: { category: true } },
                        options: { include: { option: { include: { group: true } } } },
                    },
                },
            },
        });
        return orders.map((o) => ({
            id: o.id,
            orderNo: o.orderNo,
            status: o.status,
            source: o.source,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            createdAt: o.createdAt,
            table: { label: o.table.label, publicKey: o.table.publicKey },
            totalCents: o.items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0),
            items: o.items.map((it) => ({
                qty: it.qty,
                unitPrice: it.unitPrice,
                name: it.item.name,
            })),
        }));
    });
};
