import { requireStaffHook } from "../plugins/staffGuard";
import { enqueueOutbox } from "../services/outbox.service";
const STORE_ID = "store_1";
function sum(nums) {
    return nums.reduce((a, b) => a + b, 0);
}
function calculateShotsUpcharge(shotsQty, pricingMode) {
    if (shotsQty === 0 || !pricingMode)
        return 0;
    if (pricingMode === "ESPRESSO_FREE2_PAIR40") {
        // First 2 shots are FREE
        const extraShots = Math.max(0, shotsQty - 2);
        if (extraShots === 0)
            return 0;
        // Charge ₱40 per 2 shots beyond the first 2
        const chargedPairs = Math.ceil(extraShots / 2);
        return chargedPairs * 4000; // 4000 cents = ₱40
    }
    else if (pricingMode === "PAIR40_NO_FREE") {
        // All shots charged at ₱40 per 2-shot pair
        const pairs = Math.ceil(shotsQty / 2);
        return pairs * 4000; // 4000 cents = ₱40 per pair
    }
    return 0;
}
function calculateMilkUpcharge(milkChoice, defaultMilk) {
    const itemDefaultMilk = defaultMilk || "FULL_CREAM";
    const selectedMilk = milkChoice || itemDefaultMilk;
    return selectedMilk !== itemDefaultMilk ? 1000 : 0; // 1000 cents = ₱10
}
export async function posTransactionsRoutes(app) {
    app.addHook("preHandler", requireStaffHook);
    // List recent transactions with pagination
    const listTransactions = async (req) => {
        const query = req.query;
        const limit = Math.min(parseInt(query.limit || "30") || 30, 100);
        const cursor = query.cursor ? parseInt(query.cursor) : null;
        const transactions = await app.prisma.transaction.findMany({
            where: {
                storeId: STORE_ID,
                ...(cursor ? { transactionNo: { lt: cursor } } : {}),
            },
            orderBy: { transactionNo: "desc" },
            take: limit + 1, // Fetch one extra to determine if there's a next page
            include: {
                lineItems: {
                    include: {
                        refundItems: true,
                    },
                },
                payments: true,
                table: { select: { label: true, zone: { select: { code: true } } } },
                refunds: {
                    include: {
                        refundItems: true,
                    },
                },
            },
        });
        const hasMore = transactions.length > limit;
        const items = hasMore ? transactions.slice(0, limit) : transactions;
        const nextCursor = hasMore ? items[items.length - 1].transactionNo : null;
        return {
            items,
            nextCursor,
            hasMore,
        };
    };
    app.get("/pos/transactions", listTransactions);
    app.get("/pos/transactions/list", listTransactions);
    // Create transaction + line items (no payment yet)
    app.post("/pos/transactions", async (req, reply) => {
        const body = req.body;
        if (!Array.isArray(body?.items) || body.items.length === 0) {
            reply.code(400);
            return { error: "EMPTY_ITEMS" };
        }
        // TODO: RegisterSession enforcement disabled until cash reconciliation module is implemented.
        // Staff login (cashier PIN) is sufficient for auditing.
        // When cash reconciliation is ready, uncomment the check below and require an open register.
        // Find open register session (optional, for linking only)
        const open = await app.prisma.registerSession.findFirst({
            where: { storeId: STORE_ID, status: "OPEN" },
            orderBy: { openedAt: "desc" },
            select: { id: true },
        });
        // Enforcement disabled: transactions can proceed without an open register
        // if (!open) {
        //   reply.code(409);
        //   return { error: "NO_OPEN_REGISTER" };
        // }
        let tableId = null;
        if (body.tablePublicKey) {
            const table = await app.prisma.table.findUnique({
                where: { publicKey: body.tablePublicKey },
                select: { id: true },
            });
            if (!table) {
                reply.code(404);
                return { error: "TABLE_NOT_FOUND" };
            }
            tableId = table.id;
        }
        // transactionNo: same max+1 style as orderNo (store-scoped)
        const last = await app.prisma.transaction.findFirst({
            where: { storeId: STORE_ID },
            orderBy: { transactionNo: "desc" },
            select: { transactionNo: true },
        });
        const nextNo = (last?.transactionNo ?? 0) + 1;
        const itemIds = [...new Set(body.items.map((i) => i.itemId))];
        const optionIds = [...new Set(body.items.flatMap((i) => i.optionIds ?? []))];
        const dbItems = await app.prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: {
                id: true,
                name: true,
                basePrice: true,
                defaultMilk: true,
                shotsPricingMode: true,
                foodpandaSurchargeCents: true,
            },
        });
        const itemMap = new Map(dbItems.map((i) => [i.id, i]));
        const dbOptions = await app.prisma.option.findMany({
            where: { id: { in: optionIds } },
            select: { id: true, name: true, priceDelta: true, group: { select: { name: true } } },
        });
        const optionMap = new Map(dbOptions.map((o) => [o.id, o]));
        const discountCents = Math.max(0, Math.trunc(Number(body.discountCents ?? 0)));
        // Determine service type, source
        // NOTE: Service fees are now per-line (lineSurchargeCents), not transaction-level
        const serviceTypeInput = body.serviceType ?? "DINE_IN";
        let serviceType;
        let source;
        if (serviceTypeInput === "FOODPANDA" || serviceTypeInput === "DELIVERY") {
            serviceType = "DELIVERY";
            source = "FOODPANDA";
        }
        else if (serviceTypeInput === "TO_GO") {
            serviceType = "TO_GO";
            source = "POS";
        }
        else {
            serviceType = "DINE_IN";
            source = "POS";
        }
        // Build line snapshots + totals
        const lineSnapshots = body.items.map((it) => {
            const dbItem = itemMap.get(it.itemId);
            if (!dbItem)
                throw new Error(`Invalid itemId: ${it.itemId}`);
            const qty = Math.max(1, Math.trunc(it.qty || 1));
            const optIds = it.optionIds ?? [];
            const deltas = optIds.map((oid) => optionMap.get(oid)?.priceDelta ?? 0);
            let modifiersCents = sum(deltas);
            // Add espresso shots upcharge (server-side recalculation for money safety)
            const shotsQty = it.shotsQty ?? 0;
            const shotsUpchargeCents = calculateShotsUpcharge(shotsQty, dbItem.shotsPricingMode);
            modifiersCents += shotsUpchargeCents;
            // Add milk upcharge (₱10 for non-default milk)
            const milkUpchargeCents = calculateMilkUpcharge(it.milkChoice, dbItem.defaultMilk);
            modifiersCents += milkUpchargeCents;
            // Add per-line surcharge (e.g., FOODPANDA)
            const lineSurchargeCents = it.surchargeCents ?? 0;
            // Per-line discount
            const lineDiscountCents = Math.max(0, Math.trunc(Number(it.discountAmount ?? 0)));
            const unitPrice = dbItem.basePrice; // base only
            const lineSubtotal = (unitPrice + modifiersCents) * qty + (lineSurchargeCents * qty);
            const lineTotal = Math.max(0, lineSubtotal - lineDiscountCents);
            // Build options JSON including shots and milk for audit trail
            const optionsData = optIds.map((oid) => {
                const o = optionMap.get(oid);
                return o
                    ? { id: oid, name: o.name, group: o.group?.name, priceDelta: o.priceDelta }
                    : { id: oid, missing: true };
            });
            if (shotsQty > 0) {
                optionsData.push({
                    type: "shots",
                    qty: shotsQty,
                    upchargeCents: shotsUpchargeCents
                });
            }
            if (it.milkChoice && it.milkChoice !== dbItem.defaultMilk) {
                optionsData.push({
                    type: "milk",
                    choice: it.milkChoice,
                    upchargeCents: milkUpchargeCents
                });
            }
            if (lineSurchargeCents > 0) {
                optionsData.push({
                    type: "surcharge",
                    amountCents: lineSurchargeCents,
                    reason: "FOODPANDA"
                });
            }
            if (lineDiscountCents > 0) {
                optionsData.push({
                    type: "discount",
                    pct: it.discountPct ?? 0,
                    amountCents: lineDiscountCents,
                    tag: it.discountTag
                });
            }
            const optionsJson = JSON.stringify(optionsData);
            return {
                itemId: dbItem.id,
                name: dbItem.name,
                qty,
                unitPrice,
                modifiersCents,
                lineTotal,
                note: it.note?.trim() || null,
                optionsJson,
            };
        });
        const subtotalCents = sum(lineSnapshots.map((l) => l.lineTotal));
        // Note: serviceCents is now 0 because surcharges are per-line (already included in lineTotal)
        const totalCents = Math.max(0, subtotalCents - discountCents);
        // Debug logging for money accuracy
        console.log("[TX CREATE] Pricing breakdown:", {
            lineCount: lineSnapshots.length,
            lines: lineSnapshots.map(l => ({
                name: l.name,
                qty: l.qty,
                unitPrice: l.unitPrice,
                modifiersCents: l.modifiersCents,
                lineTotal: l.lineTotal,
            })),
            subtotalCents,
            discountCents,
            totalCents,
        });
        const created = await app.prisma.transaction.create({
            data: {
                storeId: STORE_ID,
                transactionNo: nextNo,
                status: "OPEN",
                source,
                serviceType,
                registerSessionId: open?.id || null, // Optional: link to register session if open
                tableId,
                orderId: body.orderId || null, // Link to QR order if provided
                subtotalCents,
                discountCents,
                serviceCents: 0, // Surcharges are per-line, not transaction-level
                totalCents,
                lineItems: { create: lineSnapshots },
            },
            include: { lineItems: true, payments: true },
        });
        await app.prisma.auditLog.create({
            data: {
                storeId: STORE_ID,
                action: "TRANSACTION_CREATE",
                entity: "Transaction",
                entityId: created.id,
                metaJson: JSON.stringify({ transactionNo: created.transactionNo, totalCents: created.totalCents }),
            },
        });
        return created;
    });
    // Add payment (supports split tender)
    app.post("/pos/transactions/:id/payments", async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        const amountCents = Math.trunc(Number(body?.amountCents ?? NaN));
        if (!Number.isFinite(amountCents) || amountCents <= 0) {
            reply.code(400);
            return { error: "INVALID_AMOUNT" };
        }
        if (!body?.method) {
            reply.code(400);
            return { error: "MISSING_METHOD" };
        }
        const transaction = await app.prisma.transaction.findUnique({
            where: { id },
            include: { payments: true, lineItems: true },
        });
        if (!transaction) {
            reply.code(404);
            return { error: "TRANSACTION_NOT_FOUND" };
        }
        if (transaction.status === "VOID") {
            reply.code(409);
            return { error: "TRANSACTION_VOID" };
        }
        const payment = await app.prisma.transactionPayment.create({
            data: {
                transactionId: transaction.id,
                method: body.method,
                status: "PAID",
                amountCents,
                refNo: body.refNo?.trim() || null,
            },
        });
        // Recompute total paid and update transaction status if fully paid
        const allPayments = await app.prisma.transactionPayment.findMany({
            where: { transactionId: transaction.id, status: "PAID" },
        });
        const totalPaid = sum(allPayments.map((p) => p.amountCents));
        if (totalPaid >= transaction.totalCents && transaction.status === "OPEN") {
            await app.prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: "PAID" },
            });
            // Inventory auto-deduction (best effort): do not block sale on failure
            const staff = req.staff;
            const lineItems = transaction.lineItems
                .filter((l) => l.itemId)
                .map((l) => ({ itemId: l.itemId, qty: l.qty }));
            if (lineItems.length > 0) {
                try {
                    await app.inventoryService.consumeForSale({
                        storeId: transaction.storeId,
                        transactionId: transaction.id,
                        lineItems,
                        createdByStaffId: staff?.id,
                    });
                }
                catch (err) {
                    app.log.error({ err, transactionId: transaction.id, storeId: transaction.storeId }, "[INVENTORY] Sale consumption failed, enqueueing for retry");
                    await enqueueOutbox(app.prisma, {
                        storeId: transaction.storeId,
                        topic: "inventory.consume.sale",
                        payload: {
                            transactionId: transaction.id,
                            lineItems,
                            createdByStaffId: staff?.id ?? null,
                        },
                    });
                }
            }
        }
        return { ok: true, payment };
    });
    // Void transaction (entire transaction)
    app.post("/pos/transactions/:id/void", async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        const reason = body?.reason?.trim();
        if (!reason) {
            reply.code(400);
            return { error: "MISSING_REASON" };
        }
        const transaction = await app.prisma.transaction.findUnique({
            where: { id },
            include: { payments: true },
        });
        if (!transaction) {
            reply.code(404);
            return { error: "TRANSACTION_NOT_FOUND" };
        }
        if (transaction.status === "VOID")
            return transaction;
        const voided = await app.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: "VOID",
                voidedAt: new Date(),
                voidReason: reason,
                payments: { updateMany: { where: { status: "PAID" }, data: { status: "VOID" } } },
            },
            include: { payments: true, lineItems: true },
        });
        await app.prisma.auditLog.create({
            data: {
                storeId: STORE_ID,
                action: "TRANSACTION_VOID",
                entity: "Transaction",
                entityId: voided.id,
                note: reason,
            },
        });
        return voided;
    });
    // Refund specific line items
    app.post("/pos/transactions/:id/refund", async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        // Validate admin PIN
        const adminPin = body?.adminPin?.trim();
        if (!adminPin) {
            reply.code(400);
            return { error: "MISSING_ADMIN_PIN" };
        }
        // Check if staff is admin (hardcoded PIN for now, can be enhanced)
        const ADMIN_PIN = "1234";
        if (adminPin !== ADMIN_PIN) {
            reply.code(403);
            return { error: "INVALID_ADMIN_PIN" };
        }
        const reason = body?.reason?.trim();
        if (!reason) {
            reply.code(400);
            return { error: "MISSING_REASON" };
        }
        const lineIds = body?.lineIds;
        if (!Array.isArray(lineIds) || lineIds.length === 0) {
            reply.code(400);
            return { error: "MISSING_LINE_IDS" };
        }
        // Load transaction with line items and existing refunds
        const transaction = await app.prisma.transaction.findUnique({
            where: { id },
            include: {
                lineItems: {
                    include: {
                        refundItems: true,
                    },
                },
                payments: true,
                refunds: {
                    include: {
                        refundItems: true,
                    },
                },
            },
        });
        if (!transaction) {
            reply.code(404);
            return { error: "TRANSACTION_NOT_FOUND" };
        }
        if (transaction.status === "VOID") {
            reply.code(409);
            return { error: "TRANSACTION_VOIDED" };
        }
        // Validate line IDs exist
        const validLineIds = new Set(transaction.lineItems.map(l => l.id));
        const invalidIds = lineIds.filter(id => !validLineIds.has(id));
        if (invalidIds.length > 0) {
            reply.code(400);
            return { error: "INVALID_LINE_IDS", invalidIds };
        }
        // Check if any lines are already fully refunded
        const alreadyRefunded = lineIds.filter(lineId => {
            const line = transaction.lineItems.find(l => l.id === lineId);
            if (!line)
                return false;
            const totalRefunded = line.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
            return totalRefunded >= line.qty;
        });
        if (alreadyRefunded.length > 0) {
            reply.code(409);
            return { error: "LINES_ALREADY_REFUNDED", lineIds: alreadyRefunded };
        }
        // Create refund record
        const refundItems = lineIds.map(lineId => {
            const line = transaction.lineItems.find(l => l.id === lineId);
            if (!line)
                throw new Error("Line not found");
            return {
                transactionLineItemId: lineId,
                qtyRefunded: line.qty,
                amountRefundedCents: line.lineTotal,
            };
        });
        const refund = await app.prisma.transactionRefund.create({
            data: {
                transactionId: transaction.id,
                reason,
                refundedByStaffId: null, // TODO: Link to actual staff when available
                refundItems: {
                    create: refundItems,
                },
            },
            include: {
                refundItems: {
                    include: {
                        transactionLineItem: true,
                    },
                },
            },
        });
        // Reload transaction with all refunds
        const updatedTransaction = await app.prisma.transaction.findUnique({
            where: { id },
            include: {
                lineItems: {
                    include: {
                        refundItems: true,
                    },
                },
                payments: true,
                refunds: {
                    include: {
                        refundItems: {
                            include: {
                                transactionLineItem: true,
                            },
                        },
                    },
                },
            },
        });
        return updatedTransaction;
    });
    // Receipt view
    app.get("/pos/transactions/:id/receipt", async (req, reply) => {
        const { id } = req.params;
        const transaction = await app.prisma.transaction.findUnique({
            where: { id },
            include: {
                lineItems: {
                    include: {
                        refundItems: true,
                    },
                },
                payments: true,
                table: { include: { zone: true } },
                refunds: {
                    include: {
                        refundItems: true,
                    },
                },
            },
        });
        if (!transaction) {
            reply.code(404);
            return { error: "TRANSACTION_NOT_FOUND" };
        }
        return transaction;
    });
}
