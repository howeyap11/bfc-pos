import { z } from "zod";
import { processOutboxForTopic } from "../services/outbox.service";
/**
 * Inventory Management Routes
 *
 * Provides endpoints for managing inventory movements, stock levels,
 * and ingredient tracking.
 */
const InventoryMovementTypeSchema = z.enum([
    "PURCHASE",
    "CONSUMPTION",
    "WASTAGE",
    "ADJUSTMENT",
    "COUNT_CORRECTION",
    "TRANSFER_IN",
    "TRANSFER_OUT",
]);
export const inventoryRoutes = async (app) => {
    // POST /inventory/movements - Create a new inventory movement
    app.post("/inventory/movements", { preHandler: app.requireStaff }, async (req, reply) => {
        const bodySchema = z.object({
            storeId: z.string().default("store_1"),
            ingredientId: z.string(),
            type: InventoryMovementTypeSchema,
            qtyDelta: z.union([z.string(), z.number()]),
            unitId: z.string(),
            refType: z.string().optional(),
            refId: z.string().optional(),
            notes: z.string().optional(),
            createdByStaffId: z.string().optional(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const result = await app.inventoryService.postMovement(body);
            return {
                success: true,
                movement: result.movement,
                stock: result.stock,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to post inventory movement");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to post movement",
            };
        }
    });
    // POST /inventory/movements/batch - Create multiple movements in one transaction
    app.post("/inventory/movements/batch", { preHandler: app.requireStaff }, async (req, reply) => {
        const bodySchema = z.object({
            movements: z.array(z.object({
                storeId: z.string().default("store_1"),
                ingredientId: z.string(),
                type: InventoryMovementTypeSchema,
                qtyDelta: z.union([z.string(), z.number()]),
                unitId: z.string(),
                refType: z.string().optional(),
                refId: z.string().optional(),
                notes: z.string().optional(),
                createdByStaffId: z.string().optional(),
            })),
        });
        try {
            const body = bodySchema.parse(req.body);
            const results = await app.inventoryService.postMovementsBatch(body.movements);
            return {
                success: true,
                count: results.length,
                results,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to post batch movements");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to post batch movements",
            };
        }
    });
    // GET /inventory/movements - List inventory movements with filters
    app.get("/inventory/movements", { preHandler: app.requireStaff }, async (req, reply) => {
        const querySchema = z.object({
            storeId: z.string().default("store_1"),
            ingredientId: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            refType: z.string().optional(),
            refId: z.string().optional(),
            limit: z.string().optional(),
            offset: z.string().optional(),
        });
        try {
            const query = querySchema.parse(req.query);
            const params = {
                storeId: query.storeId,
                ingredientId: query.ingredientId,
                refType: query.refType,
                refId: query.refId,
                limit: query.limit ? parseInt(query.limit) : 100,
                offset: query.offset ? parseInt(query.offset) : 0,
            };
            if (query.dateFrom) {
                params.dateFrom = new Date(query.dateFrom);
            }
            if (query.dateTo) {
                params.dateTo = new Date(query.dateTo);
            }
            const result = await app.inventoryService.listMovements(params);
            return {
                success: true,
                ...result,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to list movements");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to list movements",
            };
        }
    });
    // GET /inventory/stock/:ingredientId - Get on-hand quantity for an ingredient
    app.get("/inventory/stock/:ingredientId", { preHandler: app.requireStaff }, async (req, reply) => {
        const paramsSchema = z.object({
            ingredientId: z.string(),
        });
        const querySchema = z.object({
            storeId: z.string().default("store_1"),
        });
        try {
            const params = paramsSchema.parse(req.params);
            const query = querySchema.parse(req.query);
            const onHandQty = await app.inventoryService.getOnHand({
                storeId: query.storeId,
                ingredientId: params.ingredientId,
            });
            return {
                success: true,
                ingredientId: params.ingredientId,
                onHandQty: onHandQty.toString(),
            };
        }
        catch (e) {
            app.log.error(e, "Failed to get stock");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to get stock",
            };
        }
    });
    // GET /inventory/stock-levels - Get stock levels for multiple ingredients
    app.get("/inventory/stock-levels", { preHandler: app.requireStaff }, async (req, reply) => {
        const querySchema = z.object({
            storeId: z.string().default("store_1"),
            ingredientIds: z.string().optional(), // Comma-separated list
        });
        try {
            const query = querySchema.parse(req.query);
            const params = {
                storeId: query.storeId,
            };
            if (query.ingredientIds) {
                params.ingredientIds = query.ingredientIds.split(",").filter(Boolean);
            }
            const stockLevels = await app.inventoryService.getStockLevels(params);
            return {
                success: true,
                stockLevels,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to get stock levels");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to get stock levels",
            };
        }
    });
    // POST /inventory/recalc-stock - Recalculate stock from ledger (admin repair)
    app.post("/inventory/recalc-stock", { preHandler: app.requireStaff }, async (req, reply) => {
        const bodySchema = z.object({
            storeId: z.string().default("store_1"),
            ingredientId: z.string(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const result = await app.inventoryService.recalcStockFromLedger(body);
            return {
                success: true,
                ...result,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to recalculate stock");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to recalculate stock",
            };
        }
    });
    // POST /inventory/outbox/process - Process pending outbox (retry failed inventory deductions)
    app.post("/inventory/outbox/process", { preHandler: app.requireStaff }, async (req, reply) => {
        const bodySchema = z.object({
            topic: z.string().default("inventory.consume.sale"),
            maxItems: z.number().optional().default(10),
        });
        try {
            const body = bodySchema.parse(req.body ?? {});
            const result = await processOutboxForTopic(app.prisma, app.inventoryService, body.topic, body.maxItems);
            return {
                success: true,
                ...result,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to process outbox");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to process outbox",
            };
        }
    });
    // Ingredient CRUD endpoints
    // GET /inventory/ingredients - List all ingredients
    app.get("/inventory/ingredients", { preHandler: app.requireStaff }, async (req, reply) => {
        const querySchema = z.object({
            storeId: z.string().default("store_1"),
            isActive: z.string().optional(),
        });
        try {
            const query = querySchema.parse(req.query);
            const where = { storeId: query.storeId };
            if (query.isActive !== undefined) {
                where.isActive = query.isActive === "true";
            }
            const ingredients = await app.prisma.ingredient.findMany({
                where,
                include: {
                    unit: true,
                    stock: true,
                },
                orderBy: { name: "asc" },
            });
            return {
                success: true,
                ingredients,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to list ingredients");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to list ingredients",
            };
        }
    });
    // POST /inventory/ingredients - Create a new ingredient
    app.post("/inventory/ingredients", { preHandler: app.requireStaff }, async (req, reply) => {
        const bodySchema = z.object({
            storeId: z.string().default("store_1"),
            sku: z.string().optional(),
            name: z.string(),
            unitId: z.string(),
            reorderLevel: z.string().optional(),
            isActive: z.boolean().default(true),
        });
        try {
            const body = bodySchema.parse(req.body);
            const ingredient = await app.prisma.ingredient.create({
                data: body,
                include: {
                    unit: true,
                },
            });
            return {
                success: true,
                ingredient,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to create ingredient");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to create ingredient",
            };
        }
    });
    // PATCH /inventory/ingredients/:id - Update an ingredient
    app.patch("/inventory/ingredients/:id", { preHandler: app.requireStaff }, async (req, reply) => {
        const paramsSchema = z.object({
            id: z.string(),
        });
        const bodySchema = z.object({
            sku: z.string().optional(),
            name: z.string().optional(),
            unitId: z.string().optional(),
            reorderLevel: z.string().optional(),
            isActive: z.boolean().optional(),
        });
        try {
            const params = paramsSchema.parse(req.params);
            const body = bodySchema.parse(req.body);
            const ingredient = await app.prisma.ingredient.update({
                where: { id: params.id },
                data: body,
                include: {
                    unit: true,
                },
            });
            return {
                success: true,
                ingredient,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to update ingredient");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to update ingredient",
            };
        }
    });
    // Inventory Units CRUD
    // GET /inventory/units - List all inventory units
    app.get("/inventory/units", { preHandler: app.requireStaff }, async (req, reply) => {
        const querySchema = z.object({
            storeId: z.string().default("store_1"),
        });
        try {
            const query = querySchema.parse(req.query);
            const units = await app.prisma.inventoryUnit.findMany({
                where: { storeId: query.storeId },
                orderBy: { name: "asc" },
            });
            return {
                success: true,
                units,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to list units");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to list units",
            };
        }
    });
    // POST /inventory/units - Create a new inventory unit
    app.post("/inventory/units", { preHandler: app.requireStaff }, async (req, reply) => {
        const bodySchema = z.object({
            storeId: z.string().default("store_1"),
            code: z.string(),
            name: z.string(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const unit = await app.prisma.inventoryUnit.create({
                data: body,
            });
            return {
                success: true,
                unit,
            };
        }
        catch (e) {
            app.log.error(e, "Failed to create unit");
            reply.code(400);
            return {
                success: false,
                error: e.message || "Failed to create unit",
            };
        }
    });
};
