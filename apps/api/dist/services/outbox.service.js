import { buildCloudSyncListsFromTransaction, } from "./transactionSync.service";
export async function enqueueOutbox(prisma, params) {
    if (!prisma.localOutbox) {
        throw new Error("Prisma client missing LocalOutbox model. Run: cd apps/api && pnpm exec prisma generate");
    }
    const { storeId, topic, payload } = params;
    const record = await prisma.localOutbox.create({
        data: {
            storeId,
            topic,
            payloadJson: JSON.stringify(payload),
            status: "PENDING",
            attempts: 0,
        },
    });
    return record;
}
/**
 * Enqueue PAID/VOID transactions that are not already covered by a transaction.cloud.sync
 * outbox row. Resets FAILED items to PENDING so they can be retried.
 * Use after outages or before cloud was configured.
 */
export async function backfillTransactionSyncOutbox(prisma) {
    if (!prisma.localOutbox) {
        throw new Error("Prisma client missing LocalOutbox model. Run: cd apps/api && pnpm exec prisma generate");
    }
    // Recover FAILED items: reset to PENDING so they get retried
    const failedResult = await prisma.localOutbox.updateMany({
        where: { topic: "transaction.cloud.sync", status: "FAILED" },
        data: { status: "PENDING", attempts: 0 },
    });
    const recoveredFailed = failedResult.count;
    const outboxItems = await prisma.localOutbox.findMany({
        where: { topic: "transaction.cloud.sync" },
        select: { status: true, payloadJson: true },
    });
    const alreadyQueued = new Set();
    for (const item of outboxItems) {
        try {
            const payload = JSON.parse(item.payloadJson);
            if (typeof payload.transactionId === "string") {
                alreadyQueued.add(payload.transactionId);
            }
        }
        catch {
            // ignore malformed payload
        }
    }
    const transactions = await prisma.transaction.findMany({
        where: { status: { in: ["PAID", "VOID"] } },
        select: { id: true, storeId: true },
    });
    let enqueued = 0;
    for (const tx of transactions) {
        if (alreadyQueued.has(tx.id))
            continue;
        await enqueueOutbox(prisma, {
            storeId: tx.storeId,
            topic: "transaction.cloud.sync",
            payload: { transactionId: tx.id },
        });
        enqueued++;
        alreadyQueued.add(tx.id);
    }
    return {
        scanned: transactions.length,
        enqueued,
        skippedAlreadyQueued: transactions.length - enqueued,
        recoveredFailed,
    };
}
/**
 * Process PENDING outbox items for a topic.
 * Call from cron or admin endpoint to retry failed inventory deductions.
 */
export async function processOutboxForTopic(prisma, inventoryService, topic, maxItems = 10) {
    if (!prisma.localOutbox) {
        throw new Error("Prisma client missing LocalOutbox model. Run: cd apps/api && pnpm exec prisma generate");
    }
    const items = await prisma.localOutbox.findMany({
        where: { topic, status: "PENDING" },
        take: maxItems,
        orderBy: { createdAt: "asc" },
    });
    let succeeded = 0;
    let failed = 0;
    for (const item of items) {
        try {
            const payload = JSON.parse(item.payloadJson);
            if (topic === "inventory.consume.sale") {
                const transactionId = payload.transactionId;
                const lineItems = payload.lineItems;
                const createdByStaffId = payload.createdByStaffId;
                if (typeof transactionId !== "string" || !Array.isArray(lineItems)) {
                    throw new Error("Invalid payload: missing transactionId or lineItems");
                }
                await inventoryService.consumeForSale({
                    storeId: item.storeId,
                    transactionId,
                    lineItems,
                    createdByStaffId: typeof createdByStaffId === "string" ? createdByStaffId : undefined,
                });
            }
            else {
                throw new Error(`Unknown topic: ${topic}`);
            }
            await prisma.localOutbox.update({
                where: { id: item.id },
                data: { status: "SENT", attempts: item.attempts + 1 },
            });
            succeeded++;
        }
        catch (err) {
            await prisma.localOutbox.update({
                where: { id: item.id },
                data: {
                    status: "FAILED",
                    attempts: item.attempts + 1,
                    lastError: err?.message ?? String(err),
                },
            });
            failed++;
        }
    }
    return { processed: items.length, succeeded, failed };
}
/** Backoff seconds: gentle from attempt 3 (30s, 60s, 120s, 240s, 480s, 960s, 3600 cap). Prevents API hammering. */
function backoffSeconds(attempts) {
    if (attempts < 3)
        return 0;
    return Math.min(3600, 30 * Math.pow(2, Math.min(attempts - 3, 6)));
}
/**
 * Process PENDING and retryable FAILED outbox items for topic "transaction.cloud.sync".
 * Loads transaction with refunds, calls uploadFn, marks SENT on success.
 * On failure: keeps PENDING, increments attempts, stores lastError + lastAttemptAt, applies backoff.
 * Never permanently abandons. Logs warnings at attempts>5, errors at attempts>10.
 */
export async function processTransactionSyncOutbox(prisma, uploadFn, maxItems = 20, log) {
    if (!prisma.localOutbox) {
        throw new Error("Prisma client missing LocalOutbox model. Run: cd apps/api && pnpm exec prisma generate");
    }
    const now = new Date();
    const allCandidates = await prisma.localOutbox.findMany({
        where: {
            topic: "transaction.cloud.sync",
            status: { in: ["PENDING", "FAILED"] },
        },
        take: maxItems * 2,
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            payloadJson: true,
            attempts: true,
            updatedAt: true,
            lastAttemptAt: true,
        },
    });
    const items = allCandidates.filter((item) => {
        const backoff = backoffSeconds(item.attempts);
        if (backoff === 0)
            return true;
        const lastAttempt = item.lastAttemptAt ?? item.updatedAt;
        const retryAfter = new Date(lastAttempt.getTime() + backoff * 1000);
        return now >= retryAfter;
    }).slice(0, maxItems);
    let succeeded = 0;
    let failed = 0;
    for (const item of items) {
        try {
            const payload = JSON.parse(item.payloadJson);
            const transactionId = payload.transactionId;
            if (typeof transactionId !== "string") {
                throw new Error("Invalid payload: missing transactionId");
            }
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: {
                    payments: true,
                    lineItems: { include: { item: { select: { cloudId: true } } } },
                    refunds: { include: { refundItems: true } },
                },
            });
            if (!transaction) {
                throw new Error(`Transaction not found: ${transactionId}`);
            }
            const { paymentsList, lineItemsList, refundAmountCents, refundsList } = buildCloudSyncListsFromTransaction(transaction);
            const result = await uploadFn(prisma, transaction, paymentsList, lineItemsList, {
                refundAmountCents,
                refunds: refundsList,
            });
            if (!result.ok) {
                throw new Error(result.error ?? "Upload failed");
            }
            const now = new Date();
            await prisma.localOutbox.update({
                where: { id: item.id },
                data: {
                    status: "SENT",
                    attempts: item.attempts + 1,
                    lastAttemptAt: now,
                },
            });
            succeeded++;
        }
        catch (err) {
            const attempts = item.attempts + 1;
            const lastError = err?.message ?? String(err);
            const now = new Date();
            const payloadForLog = JSON.parse(item.payloadJson);
            const transactionId = payloadForLog.transactionId ?? "unknown";
            // Visibility: log at increasing severity (never stop retrying)
            if (log) {
                if (attempts > 10) {
                    log.error({ transactionId, attempts, lastError, tag: "[TransactionSync]" }, `High retry (${attempts}x): transaction sync failing`);
                }
                else if (attempts > 5) {
                    log.warn({ transactionId, attempts, lastError, tag: "[TransactionSync]" }, `Transaction sync retry ${attempts}: ${lastError}`);
                }
            }
            await prisma.localOutbox.update({
                where: { id: item.id },
                data: {
                    status: "PENDING",
                    attempts,
                    lastError,
                    lastAttemptAt: now,
                },
            });
            failed++;
        }
    }
    return { processed: items.length, succeeded, failed };
}
/**
 * Get transaction sync outbox status for admin visibility.
 * pendingCount: items with status PENDING or FAILED (awaiting retry).
 * highRetryCount: items with attempts > 10 (visible as "needs attention" but still retrying).
 */
export async function getTransactionSyncOutboxStatus(prisma) {
    if (!prisma.localOutbox) {
        return { pendingCount: 0, highRetryCount: 0 };
    }
    const [pendingCount, highRetryCount] = await Promise.all([
        prisma.localOutbox.count({
            where: {
                topic: "transaction.cloud.sync",
                status: { in: ["PENDING", "FAILED"] },
            },
        }),
        prisma.localOutbox.count({
            where: {
                topic: "transaction.cloud.sync",
                status: { in: ["PENDING", "FAILED"] },
                attempts: { gt: 10 },
            },
        }),
    ]);
    return { pendingCount, highRetryCount };
}
