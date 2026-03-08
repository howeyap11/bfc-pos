import Decimal from "decimal.js";
export class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Post an inventory movement and update stock transactionally.
     *
     * @throws Error if unit mismatch or invalid quantity
     */
    async postMovement(params) {
        const { storeId, ingredientId, type, qtyDelta, unitId, refType, refId, notes, createdByStaffId, } = params;
        // Validate and normalize qtyDelta
        let delta;
        try {
            delta = new Decimal(qtyDelta);
        }
        catch (e) {
            throw new Error(`Invalid qtyDelta: ${qtyDelta}. Must be a valid number.`);
        }
        if (delta.isNaN()) {
            throw new Error(`Invalid qtyDelta: ${qtyDelta}. Cannot be NaN.`);
        }
        // Validate ingredient exists and get its unit
        const ingredient = await this.prisma.ingredient.findUnique({
            where: { id: ingredientId },
            select: { id: true, unitId: true, storeId: true },
        });
        if (!ingredient) {
            throw new Error(`Ingredient not found: ${ingredientId}`);
        }
        if (ingredient.storeId !== storeId) {
            throw new Error(`Ingredient ${ingredientId} does not belong to store ${storeId}`);
        }
        // Enforce unit consistency
        if (unitId !== ingredient.unitId) {
            throw new Error(`Unit mismatch: Movement unit ${unitId} does not match ingredient unit ${ingredient.unitId}. Unit conversion not yet supported.`);
        }
        // Execute transactionally: create movement + update stock
        const result = await this.prisma.$transaction(async (tx) => {
            // Create movement record
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
            // Get or create stock record
            let stock = await tx.ingredientStock.findUnique({
                where: { ingredientId },
            });
            if (!stock) {
                // Create initial stock record
                stock = await tx.ingredientStock.create({
                    data: {
                        storeId,
                        ingredientId,
                        onHandQty: delta.toString(),
                    },
                });
            }
            else {
                // Update existing stock
                const currentQty = new Decimal(stock.onHandQty);
                const newQty = currentQty.plus(delta);
                // Allow negative stock (for tracking shortages)
                stock = await tx.ingredientStock.update({
                    where: { ingredientId },
                    data: {
                        onHandQty: newQty.toString(),
                    },
                });
            }
            return { movement, stock };
        });
        return result;
    }
    /**
     * Get current on-hand quantity for an ingredient.
     *
     * @returns Decimal quantity or Decimal(0) if no stock record exists
     */
    async getOnHand(params) {
        const { storeId, ingredientId } = params;
        const stock = await this.prisma.ingredientStock.findUnique({
            where: { ingredientId },
            select: { onHandQty: true, storeId: true },
        });
        if (!stock) {
            return new Decimal(0);
        }
        if (stock.storeId !== storeId) {
            throw new Error(`Stock record for ingredient ${ingredientId} does not belong to store ${storeId}`);
        }
        return new Decimal(stock.onHandQty);
    }
    /**
     * List inventory movements with optional filters.
     */
    async listMovements(params) {
        const { storeId, ingredientId, dateFrom, dateTo, refType, refId, limit = 100, offset = 0, } = params;
        const where = { storeId };
        if (ingredientId) {
            where.ingredientId = ingredientId;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = dateFrom;
            }
            if (dateTo) {
                where.createdAt.lte = dateTo;
            }
        }
        if (refType) {
            where.refType = refType;
        }
        if (refId) {
            where.refId = refId;
        }
        const [movements, total] = await Promise.all([
            this.prisma.inventoryMovement.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    ingredient: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                        },
                    },
                    unit: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.inventoryMovement.count({ where }),
        ]);
        return {
            movements,
            total,
            limit,
            offset,
        };
    }
    /**
     * Recalculate stock from ledger (admin repair function).
     *
     * Sums all movements for an ingredient and updates the stock record.
     * Use this to fix discrepancies or initialize stock from historical data.
     */
    async recalcStockFromLedger(params) {
        const { storeId, ingredientId } = params;
        // Validate ingredient exists
        const ingredient = await this.prisma.ingredient.findUnique({
            where: { id: ingredientId },
            select: { id: true, storeId: true },
        });
        if (!ingredient) {
            throw new Error(`Ingredient not found: ${ingredientId}`);
        }
        if (ingredient.storeId !== storeId) {
            throw new Error(`Ingredient ${ingredientId} does not belong to store ${storeId}`);
        }
        // Get all movements for this ingredient
        const movements = await this.prisma.inventoryMovement.findMany({
            where: { storeId, ingredientId },
            select: { qtyDelta: true },
            orderBy: { createdAt: "asc" },
        });
        // Sum all deltas
        let total = new Decimal(0);
        for (const movement of movements) {
            total = total.plus(new Decimal(movement.qtyDelta));
        }
        // Update or create stock record
        const stock = await this.prisma.ingredientStock.upsert({
            where: { ingredientId },
            update: {
                onHandQty: total.toString(),
            },
            create: {
                storeId,
                ingredientId,
                onHandQty: total.toString(),
            },
        });
        return {
            ingredientId,
            recalculatedQty: total.toString(),
            movementsProcessed: movements.length,
            stock,
        };
    }
    /**
     * Batch post movements (useful for count corrections or bulk imports).
     *
     * All movements are posted in a single transaction.
     */
    async postMovementsBatch(movements) {
        const results = await this.prisma.$transaction(async (tx) => {
            const batchResults = [];
            for (const params of movements) {
                const { storeId, ingredientId, type, qtyDelta, unitId, refType, refId, notes, createdByStaffId, } = params;
                // Validate and normalize qtyDelta
                let delta;
                try {
                    delta = new Decimal(qtyDelta);
                }
                catch (e) {
                    throw new Error(`Invalid qtyDelta for ingredient ${ingredientId}: ${qtyDelta}`);
                }
                if (delta.isNaN()) {
                    throw new Error(`Invalid qtyDelta for ingredient ${ingredientId}: ${qtyDelta}. Cannot be NaN.`);
                }
                // Validate ingredient and unit (using tx)
                const ingredient = await tx.ingredient.findUnique({
                    where: { id: ingredientId },
                    select: { id: true, unitId: true, storeId: true },
                });
                if (!ingredient) {
                    throw new Error(`Ingredient not found: ${ingredientId}`);
                }
                if (ingredient.storeId !== storeId) {
                    throw new Error(`Ingredient ${ingredientId} does not belong to store ${storeId}`);
                }
                if (unitId !== ingredient.unitId) {
                    throw new Error(`Unit mismatch for ingredient ${ingredientId}: Movement unit ${unitId} does not match ingredient unit ${ingredient.unitId}`);
                }
                // Create movement
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
                // Update stock
                let stock = await tx.ingredientStock.findUnique({
                    where: { ingredientId },
                });
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
                        data: {
                            onHandQty: newQty.toString(),
                        },
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
     * For each line item, looks up MenuItemRecipe and deducts qtyPerItem * line.qty per ingredient.
     * Creates CONSUMPTION movements with negative qtyDelta, refType="SALE", refId=transactionId.
     *
     * @param storeId - Branch/store scope
     * @param transactionId - Sale transaction ID for refId
     * @param lineItems - Sold lines with itemId and qty
     * @param createdByStaffId - Optional staff who finalized the sale
     * @returns Number of movements created, or throws on failure
     */
    async consumeForSale(params) {
        const { storeId, transactionId, lineItems, createdByStaffId } = params;
        if (!lineItems.length)
            return [];
        const menuItemIds = [...new Set(lineItems.map((l) => l.itemId))];
        const recipes = await this.prisma.menuItemRecipe.findMany({
            where: {
                storeId,
                menuItemId: { in: menuItemIds },
            },
            select: {
                menuItemId: true,
                ingredientId: true,
                unitId: true,
                qtyPerItem: true,
            },
        });
        if (recipes.length === 0)
            return [];
        // Aggregate consumption per ingredient: Map<ingredientId, { unitId, totalQty }>
        const agg = new Map();
        for (const line of lineItems) {
            const qty = Math.max(0, Math.trunc(line.qty || 1));
            if (qty === 0)
                continue;
            for (const rec of recipes) {
                if (rec.menuItemId !== line.itemId)
                    continue;
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
    /**
     * Get stock levels for multiple ingredients (useful for dashboards).
     */
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
                        unit: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                            },
                        },
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
/**
 * Create a singleton instance for use across the application.
 */
export function createInventoryService(prisma) {
    return new InventoryService(prisma);
}
