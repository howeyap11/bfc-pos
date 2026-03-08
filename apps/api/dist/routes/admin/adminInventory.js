import { z } from "zod";
import { getStoreIdFromBranch, getBranchFromRequest } from "../../plugins/adminGuard";
export const adminInventoryRoutes = async (app) => {
    const preHandler = [app.requireAdmin];
    // GET /admin/inventory/onhand
    app.get("/admin/inventory/onhand", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const stockLevels = await app.inventoryService.getStockLevels({
            storeId,
        });
        return { stockLevels };
    });
    // GET /admin/inventory/movements
    app.get("/admin/inventory/movements", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const querySchema = z.object({
            ingredientId: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            limit: z.string().optional(),
            offset: z.string().optional(),
        });
        try {
            const q = querySchema.parse(req.query);
            const params = {
                storeId,
                ingredientId: q.ingredientId,
                limit: q.limit ? parseInt(q.limit) : 100,
                offset: q.offset ? parseInt(q.offset) : 0,
            };
            if (q.dateFrom)
                params.dateFrom = new Date(q.dateFrom);
            if (q.dateTo)
                params.dateTo = new Date(q.dateTo);
            const result = await app.inventoryService.listMovements(params);
            return result;
        }
        catch (e) {
            app.log.error(e, "Failed to list movements");
            reply.code(400);
            return { error: e.message ?? "Invalid query" };
        }
    });
    // POST /admin/inventory/adjust
    app.post("/admin/inventory/adjust", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const staff = req.staff;
        const bodySchema = z.object({
            ingredientId: z.string(),
            qtyDelta: z.union([z.string(), z.number()]), // + or -
            notes: z.string().optional(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const ing = await app.prisma.ingredient.findUnique({
                where: { id: body.ingredientId },
                select: { unitId: true, storeId: true },
            });
            if (!ing || ing.storeId !== storeId) {
                reply.code(404);
                return { error: "Ingredient not found" };
            }
            const result = await app.inventoryService.postMovement({
                storeId,
                ingredientId: body.ingredientId,
                type: "ADJUSTMENT",
                qtyDelta: body.qtyDelta,
                unitId: ing.unitId,
                refType: "MANUAL",
                notes: body.notes,
                createdByStaffId: staff?.id,
            });
            return { movement: result.movement, stock: result.stock };
        }
        catch (e) {
            app.log.error(e, "Failed to adjust inventory");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
    // POST /admin/inventory/wastage
    app.post("/admin/inventory/wastage", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const staff = req.staff;
        const bodySchema = z.object({
            ingredientId: z.string(),
            qty: z.union([z.string(), z.number()]), // Positive; will be stored as negative
            notes: z.string().optional(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const qty = Number(body.qty);
            if (isNaN(qty) || qty <= 0) {
                reply.code(400);
                return { error: "qty must be a positive number" };
            }
            const ing = await app.prisma.ingredient.findUnique({
                where: { id: body.ingredientId },
                select: { unitId: true, storeId: true },
            });
            if (!ing || ing.storeId !== storeId) {
                reply.code(404);
                return { error: "Ingredient not found" };
            }
            const result = await app.inventoryService.postMovement({
                storeId,
                ingredientId: body.ingredientId,
                type: "WASTAGE",
                qtyDelta: -qty,
                unitId: ing.unitId,
                refType: "WASTAGE_REPORT",
                notes: body.notes,
                createdByStaffId: staff?.id,
            });
            return { movement: result.movement, stock: result.stock };
        }
        catch (e) {
            app.log.error(e, "Failed to record wastage");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
};
