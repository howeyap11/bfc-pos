import Decimal from "decimal.js";
import { InventoryEventKind, StockLocationCode } from "../lib/inventoryEventKinds";
export class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    effectiveStockLocation(locationCode) {
        const s = (locationCode ?? "").trim();
        return s === StockLocationCode.WAREHOUSE ? StockLocationCode.WAREHOUSE : StockLocationCode.STORE;
    }
    /**
     * For STAFF_WH_PULLOUT rows: explicit locationCode wins; legacy null is inferred from movement type
     * (TRANSFER_OUT = warehouse leg, TRANSFER_IN = store leg) so partial retries do not double-apply one bucket.
     */
    pulloutStockLegFromRow(row) {
        const raw = row.locationCode;
        if (raw != null && String(raw).trim() !== "") {
            return this.effectiveStockLocation(raw);
        }
        if (row.type === "TRANSFER_OUT")
            return StockLocationCode.WAREHOUSE;
        if (row.type === "TRANSFER_IN")
            return StockLocationCode.STORE;
        return null;
    }
    /** Apply signed qty delta to the correct denormalized stock row (store vs warehouse). */
    async applyStockDeltaTx(tx, params) {
        const { storeId, ingredientId, delta, locationCode } = params;
        if (locationCode === StockLocationCode.WAREHOUSE) {
            const row = await tx.ingredientWarehouseStock.findUnique({ where: { ingredientId } });
            if (!row) {
                await tx.ingredientWarehouseStock.create({
                    data: { storeId, ingredientId, onHandQty: delta.toString() },
                });
            }
            else {
                const next = new Decimal(row.onHandQty).plus(delta);
                await tx.ingredientWarehouseStock.update({
                    where: { ingredientId },
                    data: { onHandQty: next.toString() },
                });
            }
            return;
        }
        let stock = await tx.ingredientStock.findUnique({ where: { ingredientId } });
        if (!stock) {
            await tx.ingredientStock.create({
                data: { storeId, ingredientId, onHandQty: delta.toString() },
            });
        }
        else {
            const next = new Decimal(stock.onHandQty).plus(delta);
            await tx.ingredientStock.update({
                where: { ingredientId },
                data: { onHandQty: next.toString() },
            });
        }
    }
    /**
     * Post an inventory movement and update stock transactionally.
     */
    async postMovement(params) {
        const { storeId, ingredientId, type, qtyDelta, unitId, refType, refId, notes, createdByStaffId, locationCode, eventKind, } = params;
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
        const loc = this.effectiveStockLocation(locationCode);
        const result = await this.prisma.$transaction(async (tx) => {
            const movement = await tx.inventoryMovement.create({
                data: {
                    storeId,
                    ingredientId,
                    type,
                    qtyDelta: delta.toString(),
                    unitId,
                    locationCode: loc,
                    eventKind: eventKind ?? null,
                    refType: refType ?? null,
                    refId: refId ?? null,
                    notes: notes ?? null,
                    createdByStaffId: createdByStaffId ?? null,
                },
            });
            await this.applyStockDeltaTx(tx, { storeId, ingredientId, delta, locationCode: loc });
            const stock = loc === StockLocationCode.WAREHOUSE
                ? await tx.ingredientWarehouseStock.findUnique({ where: { ingredientId } })
                : await tx.ingredientStock.findUnique({ where: { ingredientId } });
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
    /**
     * Recompute denormalized stock from ledger for one ingredient, per location bucket.
     * Legacy rows with null locationCode count toward STORE.
     */
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
            select: { qtyDelta: true, locationCode: true },
            orderBy: { createdAt: "asc" },
        });
        let storeTotal = new Decimal(0);
        let whTotal = new Decimal(0);
        for (const m of movements) {
            const d = new Decimal(m.qtyDelta);
            const loc = this.effectiveStockLocation(m.locationCode);
            if (loc === StockLocationCode.WAREHOUSE) {
                whTotal = whTotal.plus(d);
            }
            else {
                storeTotal = storeTotal.plus(d);
            }
        }
        const [stock, wh] = await Promise.all([
            this.prisma.ingredientStock.upsert({
                where: { ingredientId },
                update: { onHandQty: storeTotal.toString() },
                create: { storeId, ingredientId, onHandQty: storeTotal.toString() },
            }),
            this.prisma.ingredientWarehouseStock.upsert({
                where: { ingredientId },
                update: { onHandQty: whTotal.toString() },
                create: { storeId, ingredientId, onHandQty: whTotal.toString() },
            }),
        ]);
        return {
            ingredientId,
            storeQty: storeTotal.toString(),
            warehouseQty: whTotal.toString(),
            movementsProcessed: movements.length,
            ingredientStock: stock,
            warehouseStock: wh,
        };
    }
    /**
     * Read current operational stock (store + warehouse) for snapshot / count compare flows.
     */
    async getOperationalStockSnapshot(params) {
        const { storeId, ingredientIds } = params;
        const ings = await this.prisma.ingredient.findMany({
            where: {
                storeId,
                isActive: true,
                ...(ingredientIds?.length ? { id: { in: ingredientIds } } : {}),
            },
            select: { id: true, name: true, unitId: true, cloudIngredientCloudId: true },
        });
        const ids = ings.map((i) => i.id);
        const [storeRows, whRows] = await Promise.all([
            this.prisma.ingredientStock.findMany({ where: { ingredientId: { in: ids } } }),
            this.prisma.ingredientWarehouseStock.findMany({ where: { ingredientId: { in: ids } } }),
        ]);
        const storeByIng = new Map(storeRows.map((r) => [r.ingredientId, r.onHandQty]));
        const whByIng = new Map(whRows.map((r) => [r.ingredientId, r.onHandQty]));
        return ings.map((i) => ({
            ingredientId: i.id,
            cloudIngredientCloudId: i.cloudIngredientCloudId,
            name: i.name,
            unitId: i.unitId,
            storeOnHandQty: storeByIng.get(i.id) ?? "0",
            warehouseOnHandQty: whByIng.get(i.id) ?? "0",
        }));
    }
    async postMovementsBatch(movements) {
        const results = await this.prisma.$transaction(async (tx) => {
            const batchResults = [];
            for (const params of movements) {
                const { storeId, ingredientId, type, qtyDelta, unitId, refType, refId, notes, createdByStaffId, locationCode, eventKind, } = params;
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
                const loc = this.effectiveStockLocation(locationCode);
                const movement = await tx.inventoryMovement.create({
                    data: {
                        storeId,
                        ingredientId,
                        type,
                        qtyDelta: delta.toString(),
                        unitId,
                        locationCode: loc,
                        eventKind: eventKind ?? null,
                        refType: refType ?? null,
                        refId: refId ?? null,
                        notes: notes ?? null,
                        createdByStaffId: createdByStaffId ?? null,
                    },
                });
                await this.applyStockDeltaTx(tx, { storeId, ingredientId, delta, locationCode: loc });
                const stock = loc === StockLocationCode.WAREHOUSE
                    ? await tx.ingredientWarehouseStock.findUnique({ where: { ingredientId } })
                    : await tx.ingredientStock.findUnique({ where: { ingredientId } });
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
                locationCode: StockLocationCode.STORE,
                eventKind: InventoryEventKind.TRANSACTION_CONSUMPTION,
            });
        }
        if (movements.length === 0)
            return [];
        await this.postMovementsBatch(movements);
        return movements;
    }
    /**
     * Ensures at least one InventoryMovement exists for this POS cloud ref so idempotency and
     * downstream checks (e.g. "sale ledger present") hold even when qty deltas are all zero.
     */
    async ensurePosCloudLedgerAnchorIfMissing(params) {
        const found = await this.prisma.inventoryMovement.findFirst({
            where: { storeId: params.storeId, refType: params.refType, refId: params.refId },
            select: { id: true },
        });
        if (found)
            return;
        const anyIng = await this.prisma.ingredient.findFirst({
            where: { storeId: params.storeId },
            orderBy: { id: "asc" },
            select: { id: true, unitId: true },
        });
        if (!anyIng)
            return;
        await this.postMovement({
            storeId: params.storeId,
            ingredientId: anyIng.id,
            type: "ADJUSTMENT",
            qtyDelta: "0",
            unitId: anyIng.unitId,
            refType: params.refType,
            refId: params.refId,
            notes: params.notes,
            createdByStaffId: params.createdByStaffId,
            locationCode: StockLocationCode.STORE,
        });
    }
    async posLedgerMarkerIfUnmapped(params) {
        const { storeId, refType, refId, movementsCreated, hadNonZeroQty, createdByStaffId, unmappedCloudIngredientIds } = params;
        if (movementsCreated > 0 || !hadNonZeroQty)
            return;
        const anyIng = await this.prisma.ingredient.findFirst({
            where: { storeId },
            orderBy: { id: "asc" },
            select: { id: true, unitId: true },
        });
        if (!anyIng)
            return;
        const idList = unmappedCloudIngredientIds && unmappedCloudIngredientIds.length > 0
            ? unmappedCloudIngredientIds.join(",")
            : "unknown";
        await this.postMovement({
            storeId,
            ingredientId: anyIng.id,
            type: "ADJUSTMENT",
            qtyDelta: "0",
            unitId: anyIng.unitId,
            refType,
            refId,
            notes: `POS ledger marker: computed qty but no local ingredient rows for cloud ids [${idList}] (${refType})`,
            createdByStaffId,
            locationCode: StockLocationCode.STORE,
        });
    }
    async applyPosCloudSaleDeductions(params) {
        const { storeId, transactionId, consumptionByCloudIngredient, createdByStaffId, inventoryWarn } = params;
        const exists = await this.prisma.inventoryMovement.findFirst({
            where: { storeId, refType: "POS_CLOUD_SALE", refId: transactionId },
        });
        if (exists)
            return;
        const hadNonZeroQty = [...consumptionByCloudIngredient.values()].some((q) => !q.isZero());
        const movements = [];
        const unmappedCloudIngredientIds = [];
        for (const [cloudId, qty] of consumptionByCloudIngredient) {
            if (qty.isZero())
                continue;
            const cid = cloudId.trim();
            const ing = (await this.prisma.ingredient.findFirst({
                where: { storeId, cloudIngredientCloudId: cid },
            })) ??
                (cid !== cloudId
                    ? await this.prisma.ingredient.findFirst({
                        where: { storeId, cloudIngredientCloudId: cloudId },
                    })
                    : null);
            if (!ing) {
                unmappedCloudIngredientIds.push(cloudId);
                continue;
            }
            movements.push({
                storeId,
                ingredientId: ing.id,
                type: "CONSUMPTION",
                qtyDelta: qty.negated().toString(),
                unitId: ing.unitId,
                refType: "POS_CLOUD_SALE",
                refId: transactionId,
                notes: `POS sale ${transactionId}`,
                createdByStaffId,
                locationCode: StockLocationCode.STORE,
                eventKind: InventoryEventKind.TRANSACTION_CONSUMPTION,
            });
        }
        if (movements.length > 0) {
            await this.postMovementsBatch(movements);
        }
        if (unmappedCloudIngredientIds.length > 0 && inventoryWarn) {
            inventoryWarn({
                event: "POS_SALE_UNMAPPED_CLOUD_INGREDIENTS",
                storeId,
                transactionId,
                unmappedCloudIngredientIds,
                unmappedCount: unmappedCloudIngredientIds.length,
            }, "[INVENTORY] Sale consumption skipped for cloud ingredient ids with no local Ingredient row (sync catalog / cloudIngredientCloudId)");
        }
        await this.posLedgerMarkerIfUnmapped({
            storeId,
            refType: "POS_CLOUD_SALE",
            refId: transactionId,
            movementsCreated: movements.length,
            hadNonZeroQty,
            createdByStaffId,
            unmappedCloudIngredientIds: unmappedCloudIngredientIds.length > 0 ? unmappedCloudIngredientIds : undefined,
        });
        await this.ensurePosCloudLedgerAnchorIfMissing({
            storeId,
            refType: "POS_CLOUD_SALE",
            refId: transactionId,
            notes: "POS sale ledger anchor (zero consumption or all lines recorded)",
            createdByStaffId,
        });
    }
    async applyPosCloudRefundRestore(params) {
        const { storeId, refundId, restoreByCloudIngredient, createdByStaffId, inventoryWarn } = params;
        const exists = await this.prisma.inventoryMovement.findFirst({
            where: { storeId, refType: "POS_CLOUD_REFUND", refId: refundId },
        });
        if (exists)
            return;
        const movements = [];
        const unmappedCloudIngredientIds = [];
        const hadNonZeroQty = [...restoreByCloudIngredient.values()].some((q) => !q.isZero());
        for (const [cloudId, qty] of restoreByCloudIngredient) {
            if (qty.isZero())
                continue;
            const cid = cloudId.trim();
            const ing = (await this.prisma.ingredient.findFirst({
                where: { storeId, cloudIngredientCloudId: cid },
            })) ??
                (cid !== cloudId
                    ? await this.prisma.ingredient.findFirst({
                        where: { storeId, cloudIngredientCloudId: cloudId },
                    })
                    : null);
            if (!ing) {
                unmappedCloudIngredientIds.push(cloudId);
                continue;
            }
            movements.push({
                storeId,
                ingredientId: ing.id,
                type: "ADJUSTMENT",
                qtyDelta: qty.toString(),
                unitId: ing.unitId,
                refType: "POS_CLOUD_REFUND",
                refId: refundId,
                notes: `POS refund restore`,
                createdByStaffId,
                locationCode: StockLocationCode.STORE,
                eventKind: InventoryEventKind.TRANSACTION_REVERSAL,
            });
        }
        if (movements.length > 0) {
            await this.postMovementsBatch(movements);
        }
        if (unmappedCloudIngredientIds.length > 0 && inventoryWarn) {
            inventoryWarn({
                event: "POS_REFUND_UNMAPPED_CLOUD_INGREDIENTS",
                storeId,
                refundId,
                unmappedCloudIngredientIds,
            }, "[INVENTORY] Refund restore skipped for unmapped cloud ingredient ids");
        }
        await this.posLedgerMarkerIfUnmapped({
            storeId,
            refType: "POS_CLOUD_REFUND",
            refId: refundId,
            movementsCreated: movements.length,
            hadNonZeroQty,
            createdByStaffId,
            unmappedCloudIngredientIds: unmappedCloudIngredientIds.length > 0 ? unmappedCloudIngredientIds : undefined,
        });
        await this.ensurePosCloudLedgerAnchorIfMissing({
            storeId,
            refType: "POS_CLOUD_REFUND",
            refId: refundId,
            notes: "POS refund inventory anchor (zero restore qty evaluated)",
            createdByStaffId,
        });
    }
    async applyPosCloudVoidRestore(params) {
        const { storeId, transactionId, restoreByCloudIngredient, createdByStaffId, inventoryWarn } = params;
        const exists = await this.prisma.inventoryMovement.findFirst({
            where: { storeId, refType: "POS_CLOUD_VOID", refId: transactionId },
        });
        if (exists)
            return;
        const movements = [];
        const unmappedCloudIngredientIds = [];
        const hadNonZeroQty = [...restoreByCloudIngredient.values()].some((q) => !q.isZero());
        for (const [cloudId, qty] of restoreByCloudIngredient) {
            if (qty.isZero())
                continue;
            const cid = cloudId.trim();
            const ing = (await this.prisma.ingredient.findFirst({
                where: { storeId, cloudIngredientCloudId: cid },
            })) ??
                (cid !== cloudId
                    ? await this.prisma.ingredient.findFirst({
                        where: { storeId, cloudIngredientCloudId: cloudId },
                    })
                    : null);
            if (!ing) {
                unmappedCloudIngredientIds.push(cloudId);
                continue;
            }
            movements.push({
                storeId,
                ingredientId: ing.id,
                type: "ADJUSTMENT",
                qtyDelta: qty.toString(),
                unitId: ing.unitId,
                refType: "POS_CLOUD_VOID",
                refId: transactionId,
                notes: `POS void restore ${transactionId}`,
                createdByStaffId,
                locationCode: StockLocationCode.STORE,
                eventKind: InventoryEventKind.TRANSACTION_REVERSAL,
            });
        }
        if (movements.length > 0) {
            await this.postMovementsBatch(movements);
        }
        if (unmappedCloudIngredientIds.length > 0 && inventoryWarn) {
            inventoryWarn({
                event: "POS_VOID_UNMAPPED_CLOUD_INGREDIENTS",
                storeId,
                transactionId,
                unmappedCloudIngredientIds,
            }, "[INVENTORY] Void restore skipped for unmapped cloud ingredient ids");
        }
        await this.posLedgerMarkerIfUnmapped({
            storeId,
            refType: "POS_CLOUD_VOID",
            refId: transactionId,
            movementsCreated: movements.length,
            hadNonZeroQty,
            createdByStaffId,
            unmappedCloudIngredientIds: unmappedCloudIngredientIds.length > 0 ? unmappedCloudIngredientIds : undefined,
        });
        await this.ensurePosCloudLedgerAnchorIfMissing({
            storeId,
            refType: "POS_CLOUD_VOID",
            refId: transactionId,
            notes: "POS void inventory anchor (zero net restore evaluated)",
            createdByStaffId,
        });
    }
    /**
     * Waste report: deduct store stock once per waste row (idempotent on waste report id).
     * Only applies when a local Ingredient exists for the synced cloud ingredient id.
     */
    async applyWasteReportDeduction(params) {
        const { storeId, wasteReportId, inventoryItemCloudId, quantityStr, createdByStaffId } = params;
        const exists = await this.prisma.inventoryMovement.findFirst({
            where: { storeId, refType: "WASTE_REPORT", refId: wasteReportId },
        });
        if (exists)
            return;
        if (!inventoryItemCloudId?.trim())
            return;
        let qty;
        try {
            qty = new Decimal(quantityStr);
        }
        catch {
            return;
        }
        if (!qty.isFinite() || qty.lte(0))
            return;
        const ing = await this.prisma.ingredient.findFirst({
            where: { storeId, cloudIngredientCloudId: inventoryItemCloudId.trim() },
        });
        if (!ing)
            return;
        await this.postMovement({
            storeId,
            ingredientId: ing.id,
            type: "WASTAGE",
            qtyDelta: qty.negated().toString(),
            unitId: ing.unitId,
            refType: "WASTE_REPORT",
            refId: wasteReportId,
            notes: `Waste report ${wasteReportId}`,
            createdByStaffId,
            locationCode: StockLocationCode.STORE,
            eventKind: InventoryEventKind.WASTE_REPORT,
        });
    }
    /**
     * Staff stock: positive adjustment at store (MAIN_CAFE mirror).
     */
    async staffStoreAdd(params) {
        const { storeId, ingredientCloudId, quantityBase, refId, notes, createdByStaffId } = params;
        const exists = await this.prisma.inventoryMovement.findFirst({
            where: { storeId, refType: "STAFF_STORE_ADD", refId },
        });
        if (exists)
            return;
        const ing = await this.prisma.ingredient.findFirst({
            where: { storeId, cloudIngredientCloudId: ingredientCloudId },
        });
        if (!ing)
            throw new Error(`Ingredient not found for cloud id ${ingredientCloudId}`);
        await this.postMovement({
            storeId,
            ingredientId: ing.id,
            type: "ADJUSTMENT",
            qtyDelta: quantityBase.toString(),
            unitId: ing.unitId,
            refType: "STAFF_STORE_ADD",
            refId,
            ...(notes != null && notes !== "" ? { notes } : {}),
            createdByStaffId,
            locationCode: StockLocationCode.STORE,
            eventKind: InventoryEventKind.STORE_ADD,
        });
    }
    async staffWarehouseAdd(params) {
        const { storeId, ingredientCloudId, quantityBase, refId, createdByStaffId } = params;
        const ing = await this.prisma.ingredient.findFirst({
            where: { storeId, cloudIngredientCloudId: ingredientCloudId },
        });
        if (!ing)
            throw new Error(`Ingredient not found for cloud id ${ingredientCloudId}`);
        await this.prisma.$transaction(async (tx) => {
            const dup = await tx.inventoryMovement.findFirst({
                where: { storeId, refType: "STAFF_WAREHOUSE_ADD", refId },
            });
            if (dup)
                return;
            await this.applyStockDeltaTx(tx, {
                storeId,
                ingredientId: ing.id,
                delta: quantityBase,
                locationCode: StockLocationCode.WAREHOUSE,
            });
            await tx.inventoryMovement.create({
                data: {
                    storeId,
                    ingredientId: ing.id,
                    type: "ADJUSTMENT",
                    qtyDelta: quantityBase.toString(),
                    unitId: ing.unitId,
                    locationCode: StockLocationCode.WAREHOUSE,
                    eventKind: InventoryEventKind.WAREHOUSE_ADD,
                    refType: "STAFF_WAREHOUSE_ADD",
                    refId,
                    notes: "Warehouse add",
                    createdByStaffId: createdByStaffId ?? null,
                },
            });
        });
    }
    async staffWarehousePulloutToStore(params) {
        const { storeId, ingredientCloudId, quantityBase, refId, notes, createdByStaffId } = params;
        const ing = await this.prisma.ingredient.findFirst({
            where: { storeId, cloudIngredientCloudId: ingredientCloudId },
        });
        if (!ing)
            throw new Error(`Ingredient not found for cloud id ${ingredientCloudId}`);
        const q = quantityBase;
        if (q.lte(0))
            return;
        await this.prisma.$transaction(async (tx) => {
            const existing = await tx.inventoryMovement.findMany({
                where: { storeId, refType: "STAFF_WH_PULLOUT", refId },
                select: { id: true, locationCode: true, type: true },
            });
            if (existing.length >= 2)
                return;
            const legs = new Set();
            for (const e of existing) {
                const leg = this.pulloutStockLegFromRow(e);
                if (leg)
                    legs.add(leg);
            }
            if (legs.has(StockLocationCode.WAREHOUSE) && legs.has(StockLocationCode.STORE))
                return;
            const hasWhLeg = legs.has(StockLocationCode.WAREHOUSE);
            const hasStoreLeg = legs.has(StockLocationCode.STORE);
            if (!hasWhLeg) {
                await this.applyStockDeltaTx(tx, {
                    storeId,
                    ingredientId: ing.id,
                    delta: q.negated(),
                    locationCode: StockLocationCode.WAREHOUSE,
                });
                await tx.inventoryMovement.create({
                    data: {
                        storeId,
                        ingredientId: ing.id,
                        type: "TRANSFER_OUT",
                        qtyDelta: q.negated().toString(),
                        unitId: ing.unitId,
                        locationCode: StockLocationCode.WAREHOUSE,
                        eventKind: InventoryEventKind.WH_PULLOUT_TO_STORE,
                        refType: "STAFF_WH_PULLOUT",
                        refId,
                        notes: (notes ? `${notes} ` : "") + "(warehouse leg)",
                        createdByStaffId: createdByStaffId ?? null,
                    },
                });
            }
            if (!hasStoreLeg) {
                await this.applyStockDeltaTx(tx, {
                    storeId,
                    ingredientId: ing.id,
                    delta: q,
                    locationCode: StockLocationCode.STORE,
                });
                await tx.inventoryMovement.create({
                    data: {
                        storeId,
                        ingredientId: ing.id,
                        type: "TRANSFER_IN",
                        qtyDelta: q.toString(),
                        unitId: ing.unitId,
                        locationCode: StockLocationCode.STORE,
                        eventKind: InventoryEventKind.WH_PULLOUT_TO_STORE,
                        refType: "STAFF_WH_PULLOUT",
                        refId,
                        notes: notes ?? "Warehouse pullout to store (store leg)",
                        createdByStaffId: createdByStaffId ?? null,
                    },
                });
            }
        });
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
