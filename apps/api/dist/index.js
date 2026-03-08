// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { join } from "path";
import prismaPlugin from "./plugins/prisma";
import inventoryServicePlugin from "./plugins/inventoryService";
import { staffGuardPlugin } from "./plugins/staffGuard";
import { adminGuardPlugin } from "./plugins/adminGuard";
import { staffQueueRoutes } from "./routes/staffQueue";
import { orderStatusRoutes } from "./routes/orderStatus";
import { functionRoomRoutes } from "./routes/functionRoom";
import { orderCancelRoutes } from "./routes/orderCancel";
import { registerRoutes } from "./routes/register";
import { posTransactionsRoutes } from "./routes/posTransactions";
import { drawerRoutes } from "./routes/drawer";
import { sopRoutes } from "./routes/sop";
import { storeConfigRoutes } from "./routes/storeConfig";
import { qrAcceptRoutes } from "./routes/qrAccept";
import { staffRoutes } from "./routes/staff";
import { inventoryRoutes } from "./routes/inventory";
import { adminItemsRoutes } from "./routes/admin/adminItems";
import { adminIngredientsRoutes } from "./routes/admin/adminIngredients";
import { adminInventoryRoutes } from "./routes/admin/adminInventory";
const app = Fastify({ logger: true });
// Plugins
await app.register(cors, { origin: true });
await app.register(multipart);
await app.register(fastifyStatic, {
    root: join(process.cwd(), "uploads"),
    prefix: "/uploads/",
});
await app.register(prismaPlugin);
await app.register(inventoryServicePlugin);
await app.register(staffGuardPlugin);
await app.register(adminGuardPlugin);
// Public staff routes (no auth required for login)
await app.register(staffRoutes);
// Staff routes (protected by x-staff-key inside the route files)
await app.register(staffQueueRoutes);
await app.register(orderStatusRoutes);
await app.register(functionRoomRoutes);
await app.register(orderCancelRoutes);
await app.register(registerRoutes);
await app.register(posTransactionsRoutes);
await app.register(drawerRoutes);
await app.register(sopRoutes);
await app.register(storeConfigRoutes);
await app.register(qrAcceptRoutes);
await app.register(inventoryRoutes);
await app.register(adminItemsRoutes);
await app.register(adminIngredientsRoutes);
await app.register(adminInventoryRoutes);
// Public routes (MUST be before listen)
app.get("/health", async () => ({
    ok: true,
    service: "api",
    ts: new Date().toISOString(),
}));
// Debug endpoint to verify staff authentication
app.get("/debug/whoami", { preHandler: app.requireStaff }, async (req) => {
    return {
        authenticated: true,
        staff: req.staff,
        headers: {
            "x-staff-key": req.headers["x-staff-key"] ? "***" : undefined,
        },
    };
});
// Debug endpoint to check database and menu counts
app.get("/debug/menu-count", async () => {
    const itemsTotal = await app.prisma.item.count();
    const itemsActive = await app.prisma.item.count({ where: { isActive: true } });
    const itemsStore1 = await app.prisma.item.count({ where: { storeId: "store_1" } });
    const categoriesTotal = await app.prisma.category.count();
    // Check if Subcategory model exists (it might not in current schema)
    let subcategoriesTotal = 0;
    try {
        // @ts-ignore - Subcategory might not exist
        subcategoriesTotal = await app.prisma.subcategory?.count() ?? 0;
    }
    catch (e) {
        // Subcategory model doesn't exist
        subcategoriesTotal = 0;
    }
    const result = {
        databaseUrl: process.env.DATABASE_URL || "not set",
        cwd: process.cwd(),
        itemsTotal,
        itemsActive,
        itemsStore1,
        categoriesTotal,
        subcategoriesTotal,
    };
    app.log.info(result, "[DEBUG] Menu count info");
    return result;
});
app.get("/tables", async () => {
    return app.prisma.table.findMany({
        where: { isActive: true },
        include: { zone: true },
    });
});
app.get("/menu", async () => {
    return app.prisma.category.findMany({
        orderBy: { sort: "asc" },
        include: {
            items: {
                where: { isActive: true },
                orderBy: { sort: "asc" },
            },
        },
    });
});
app.get("/items/:id", async (req) => {
    const { id } = req.params;
    const item = await app.prisma.item.findUnique({
        where: { id },
        include: {
            itemOptionGroups: {
                include: {
                    group: {
                        include: {
                            options: { orderBy: { sort: "asc" } },
                        },
                    },
                },
            },
        },
    });
    if (!item) {
        return { error: "NOT_FOUND" };
    }
    return item;
});
// QR Menu Orders Endpoint
// ========================
// QR orders have only 2 payment methods:
// 1. PAYMONGO - Customer paid online via PayMongo gateway
// 2. CASH - Customer pays at counter when order is ready
//
// Transaction creation happens later via cashier actions:
// - For PAYMONGO orders: Cashier clicks "ACCEPT" → creates Sale with method=PAYMONGO
// - For CASH orders: Cashier clicks "MARK PAID" → creates Sale with method=CASH
//
// This endpoint only creates the Order record. The Sale/Transaction is created
// automatically when the cashier processes the order (not here).
app.post("/orders", async (req) => {
    const body = req.body;
    if (!body?.tablePublicKey)
        return { error: "MISSING_TABLE" };
    if (!Array.isArray(body.items) || body.items.length === 0)
        return { error: "EMPTY_ITEMS" };
    const table = await app.prisma.table.findUnique({
        where: { publicKey: body.tablePublicKey },
        include: { zone: true },
    });
    if (!table)
        return { error: "TABLE_NOT_FOUND" };
    const last = await app.prisma.order.findFirst({
        orderBy: { orderNo: "desc" },
        select: { orderNo: true },
    });
    const nextNo = (last?.orderNo ?? 0) + 1;
    const itemIds = [...new Set(body.items.map((i) => i.itemId))];
    const optionIds = [...new Set(body.items.flatMap((i) => i.optionIds ?? []))];
    const dbItems = await app.prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, basePrice: true },
    });
    const itemMap = new Map(dbItems.map((i) => [i.id, i]));
    const dbOptions = await app.prisma.option.findMany({
        where: { id: { in: optionIds } },
        select: { id: true, priceDelta: true },
    });
    const optionMap = new Map(dbOptions.map((o) => [o.id, o]));
    let source = "QR_UNPAID";
    let paymentMethod = (body.paymentMethod ?? "CASH");
    let paymentStatus = "UNPAID";
    let tabId = null;
    // If order is from function room zone and FR tab is open, attach it
    if (table.zone.code === "FR" && table.isFunctionRoom) {
        const frTab = await app.prisma.tab.findFirst({
            where: { status: "OPEN", type: "FUNCTION_ROOM" },
            orderBy: { openedAt: "desc" },
        });
        if (frTab) {
            source = "FUNCTION_ROOM";
            tabId = frTab.id;
            paymentMethod = "TO_BE_DECIDED";
            paymentStatus = "UNPAID";
        }
    }
    const created = await app.prisma.order.create({
        data: {
            orderNo: nextNo,
            tableId: table.id,
            status: "PLACED",
            source,
            tabId,
            paymentMethod,
            paymentStatus,
            customerNote: body.customerNote?.trim() || null,
            items: {
                create: body.items.map((it) => {
                    const dbItem = itemMap.get(it.itemId);
                    if (!dbItem)
                        throw new Error(`Invalid itemId: ${it.itemId}`);
                    const optIds = it.optionIds ?? [];
                    const unitPrice = dbItem.basePrice +
                        optIds.reduce((sum, oid) => sum + (optionMap.get(oid)?.priceDelta ?? 0), 0);
                    return {
                        itemId: it.itemId,
                        qty: Math.max(1, it.qty || 1),
                        unitPrice,
                        lineNote: it.note?.trim() || null,
                        options: {
                            create: optIds.map((oid) => {
                                const opt = optionMap.get(oid);
                                if (!opt)
                                    throw new Error(`Invalid optionId: ${oid}`);
                                return { optionId: oid, priceDelta: opt.priceDelta };
                            }),
                        },
                    };
                }),
            },
        },
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
    return created;
});
// NOTE:
// DO NOT define app.get("/queue") here
// DO NOT define app.patch("/orders/:id/status") here
// Those are provided by staffQueueRoutes + orderStatusRoutes
// Listen (MUST be last)
await app.listen({ host: "0.0.0.0", port: 3000 });
// Log database and menu stats on boot
try {
    const itemsTotal = await app.prisma.item.count();
    const itemsActive = await app.prisma.item.count({ where: { isActive: true } });
    const itemsStore1 = await app.prisma.item.count({ where: { storeId: "store_1" } });
    const categoriesTotal = await app.prisma.category.count();
    app.log.info({
        databaseUrl: process.env.DATABASE_URL || "not set",
        cwd: process.cwd(),
        itemsTotal,
        itemsActive,
        itemsStore1,
        categoriesTotal,
    }, "[BOOT] Database and menu statistics");
}
catch (e) {
    app.log.error(e, "[BOOT] Failed to fetch menu statistics");
}
