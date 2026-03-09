import Decimal from "decimal.js";
export class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Post an inventory movement and update stock transactionally.
     */
    async postMovement(params) {
        const { storeId, ingredientId, type, qtyDelta, unitId, refType, refId, notes, createdByStaffId } = params;
        let delta;
        try {
            delta = new Decimal(qtyDelta);
        }
        catch {
            throw new Error(`Invalid qtyDelta: ${qtyDelta}. Must be a valid number.`);
        }
        if (delta.isNaN()) {
            throw new Error(`Invalid qtyDelta: ${qtyDelta}. Cannot be NaN.`);
        }
        const ingredient = await this.prisma.ingredient.findUnique({
            where: { id: ingredientId },
            select: { id: true, unitId: true, storeId: true },
        });
        if (!ingredient)
            throw new Error(`Ingredient not found: ${ingredientId}`);
        if (ingredient.storeId !== storeId) {
            throw new Error(`Ingredient ${ingredientId} does not belong to store ${storeId}`);
        }
        if (unitId !== ingredient.unitId) {
            throw new Error(`Unit mismatch: Movement unit ${unitId} does not match ingredient unit ${ingredient.unitId}. Unit conversion not yet supported.`);
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const movement = await tx.inventoryMovement.create({
                data: {
                    storeId,
                    ingredientId,
                    type,
                    qtyDelta: delta.toString(),
                    unitId,
                    refType: refType ?? null,
                    refId: refId ?? null,
                    notes: notes ?? null,
                    createdByStaffId: createdByStaffId ?? null,
                },
            });
            let stock = await tx.ingredientStock.findUnique({ where: { ingredientId } });
            if (!stock) {
                stock = await tx.ingredientStock.create({
                    data: {
                        storeId,
                        ingredientId,
                        onHandQty: delta.toString(),
                    },
                });
            }
            else {
                const currentQty = new Decimal(stock.onHandQty);
                const newQty = currentQty.plus(delta);
                stock = await tx.ingredientStock.update({
                    where: { ingredientId },
                    data: { onHandQty: newQty.toString() },
                });
            }
            return { movement, stock };
        });
        return result;
    }
    async getOnHand(params) {
        const { storeId, ingredientId } = params;
        const stock = await this.prisma.ingredientStock.findUnique({
            where: { ingredientId },
            select: { onHandQty: true, storeId: true },
        });
        if (!stock)
            return new Decimal(0);
        if (stock.storeId !== storeId) {
            throw new Error(`Stock record for ingredient ${ingredientId} does not belong to store ${storeId}`);
        }
        return new Decimal(stock.onHandQty);
    }
    async listMovements(params) {
        const { storeId, ingredientId, dateFrom, dateTo, refType, refId, limit = 100, offset = 0 } = params;
        const where = { storeId };
        if (ingredientId)
            where.ingredientId = ingredientId;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = dateFrom;
            if (dateTo)
                where.createdAt.lte = dateTo;
        }
        if (refType)
            where.refType = refType;
        if (refId)
            where.refId = refId;
        const [movements, total] = await Promise.all([
            this.prisma.inventoryMovement.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    ingredient: { select: { id: true, name: true, sku: true } },
                    unit: { select: { id: true, code: true, name: true } },
                },
            }),
            this.prisma.inventoryMovement.count({ where }),
        ]);
        return { movements, total, limit, offset };
    }
    async recalcStockFromLedger(params) {
        const { storeId, ingredientId } = params;
        const ingredient = await this.prisma.ingredient.findUnique({
            where: { id: ingredientId },
            select: { id: true, storeId: true },
        });
        if (!ingredient)
            throw new Error(`Ingredient not found: ${ingredientId}`);
        if (ingredient.storeId !== storeId) {
            throw new Error(`Ingredient ${ingredientId} does not belong to store ${storeId}`);
        }
        const movements = await this.prisma.inventoryMovement.findMany({
            where: { storeId, ingredientId },
            select: { qtyDelta: true },
            orderBy: { createdAt: "asc" },
        });
        let total = new Decimal(0);
        for (const m of movements) {
            total = total.plus(new Decimal(m.qtyDelta));
        }
        const stock = await this.prisma.ingredientStock.upsert({
            where: { ingredientId },
            update: { onHandQty: total.toString() },
            create: {
                storeId,
                ingredientId,
                onHandQty: total.toString(),
            },
        });
        return { ingredientId, recalculatedQty: total.toString(), movementsProcessed: movements.length, stock };
    }
    async postMovementsBatch(movements) {
        const results = await this.prisma.$transaction(async (tx) => {
            const batchResults = [];
            for (const params of movements) {
                const { storeId, ingredientId, type, qtyDelta, unitId, refType, refId, notes, createdByStaffId, } = params;
                let delta;
                try {
                    delta = new Decimal(qtyDelta);
                }
                catch {
                    throw new Error(`Invalid qtyDelta for ingredient ${ingredientId}: ${qtyDelta}`);
                }
                if (delta.isNaN()) {
                    throw new Error(`Invalid qtyDelta for ingredient ${ingredientId}: ${qtyDelta}. Cannot be NaN.`);
                }
                const ingredient = await tx.ingredient.findUnique({
                    where: { id: ingredientId },
                    select: { id: true, unitId: true, storeId: true },
                });
                if (!ingredient)
                    throw new Error(`Ingredient not found: ${ingredientId}`);
                if (ingredient.storeId !== storeId) {
                    throw new Error(`Ingredient ${ingredientId} does not belong to store ${storeId}`);
                }
                if (unitId !== ingredient.unitId) {
                    throw new Error(`Unit mismatch for ingredient ${ingredientId}: Movement unit ${unitId} does not match ingredient unit ${ingredient.unitId}`);
                }
                const movement = await tx.inventoryMovement.create({
                    data: {
                        storeId,
                        ingredientId,
                        type,
                        qtyDelta: delta.toString(),
                        unitId,
                        refType: refType ?? null,
                        refId: refId ?? null,
                        notes: notes ?? null,
                        createdByStaffId: createdByStaffId ?? null,
                    },
                });
                let stock = await tx.ingredientStock.findUnique({ where: { ingredientId } });
                if (!stock) {
                    stock = await tx.ingredientStock.create({
                        data: { storeId, ingredientId, onHandQty: delta.toString() },
                    });
                }
                else {
                    const currentQty = new Decimal(stock.onHandQty);
                    const newQty = currentQty.plus(delta);
                    stock = await tx.ingredientStock.update({
                        where: { ingredientId },
                        data: { onHandQty: newQty.toString() },
                    });
                }
                batchResults.push({ movement, stock });
            }
            return batchResults;
        });
        return results;
    }
    /**
     * Consume inventory for a completed sale.
     * Uses MenuItemRecipe; does not block if recipe missing (returns []).
     */
    async consumeForSale(params) {
        const { storeId, transactionId, lineItems, createdByStaffId } = params;
        if (!lineItems.length)
            return [];
        const menuItemIds = [...new Set(lineItems.map((l) => l.itemId))];
        const [recipes, sizeRecipes] = await Promise.all([
            this.prisma.menuItemRecipe.findMany({
                where: { storeId, menuItemId: { in: menuItemIds } },
                select: { menuItemId: true, ingredientId: true, unitId: true, qtyPerItem: true },
            }),
            this.prisma.menuItemRecipeSize.findMany({
                where: { storeId, menuItemId: { in: menuItemIds } },
                select: {
                    menuItemId: true,
                    ingredientId: true,
                    unitId: true,
                    qtyPerItem: true,
                    baseType: true,
                    sizeCode: true,
                },
            }),
        ]);
        if (recipes.length === 0 && sizeRecipes.length === 0)
            return [];
        const agg = new Map();
        for (const line of lineItems) {
            const qty = Math.max(0, Math.trunc(line.qty || 1));
            if (qty === 0)
                continue;
            const hasSize = !!(line.baseType && line.sizeCode);
            const applicableSizeRecipes = hasSize
                ? sizeRecipes.filter((rec) => rec.menuItemId === line.itemId &&
                    rec.baseType === line.baseType &&
                    rec.sizeCode === line.sizeCode)
                : [];
            const rowsToUse = applicableSizeRecipes.length > 0
                ? applicableSizeRecipes
                : recipes.filter((rec) => rec.menuItemId === line.itemId);
            for (const rec of rowsToUse) {
                const qtyPerItem = new Decimal(rec.qtyPerItem);
                const consume = qtyPerItem.times(qty);
                const key = rec.ingredientId;
                const existing = agg.get(key);
                if (existing) {
                    existing.totalQty = existing.totalQty.plus(consume);
                }
                else {
                    agg.set(key, { unitId: rec.unitId, totalQty: consume });
                }
            }
        }
        const movements = [];
        for (const [ingredientId, { unitId, totalQty }] of agg) {
            if (totalQty.isZero())
                continue;
            movements.push({
                storeId,
                ingredientId,
                type: "CONSUMPTION",
                qtyDelta: totalQty.negated().toString(),
                unitId,
                refType: "SALE",
                refId: transactionId,
                notes: `Sale ${transactionId}`,
                createdByStaffId: createdByStaffId ?? undefined,
            });
        }
        if (movements.length === 0)
            return [];
        await this.postMovementsBatch(movements);
        return movements;
    }
    async getStockLevels(params) {
        const { storeId, ingredientIds } = params;
        const where = { storeId };
        if (ingredientIds && ingredientIds.length > 0) {
            where.ingredientId = { in: ingredientIds };
        }
        const stocks = await this.prisma.ingredientStock.findMany({
            where,
            include: {
                ingredient: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        reorderLevel: true,
                        isActive: true,
                        unit: { select: { id: true, code: true, name: true } },
                    },
                },
            },
        });
        return stocks.map((stock) => ({
            ingredientId: stock.ingredientId,
            ingredientName: stock.ingredient.name,
            sku: stock.ingredient.sku,
            onHandQty: stock.onHandQty,
            reorderLevel: stock.ingredient.reorderLevel,
            unit: stock.ingredient.unit,
            isActive: stock.ingredient.isActive,
            isLowStock: stock.ingredient.reorderLevel
                ? new Decimal(stock.onHandQty).lessThanOrEqualTo(new Decimal(stock.ingredient.reorderLevel))
                : false,
            updatedAt: stock.updatedAt,
        }));
    }
}
export function createInventoryService(prisma) {
    return new InventoryService(prisma);
}
