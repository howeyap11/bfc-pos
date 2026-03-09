export async function enqueueOutbox(prisma, params) {
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
 * Process PENDING outbox items for a topic.
 * Call from cron or admin endpoint to retry failed inventory deductions.
 */
export async function processOutboxForTopic(prisma, inventoryService, topic, maxItems = 10) {
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
/**
 * Process PENDING outbox items for topic "transaction.cloud.sync".
 * Loads transaction by transactionId, calls uploadFn, marks SENT or FAILED.
 */
export async function processTransactionSyncOutbox(prisma, uploadFn, maxItems = 10) {
    const items = await prisma.localOutbox.findMany({
        where: { topic: "transaction.cloud.sync", status: "PENDING" },
        take: maxItems,
        orderBy: { createdAt: "asc" },
    });
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
                include: { payments: true, lineItems: true },
            });
            if (!transaction) {
                throw new Error(`Transaction not found: ${transactionId}`);
            }
            const paymentsList = transaction.payments.map((p) => ({
                method: p.method,
                amountCents: p.amountCents,
            }));
            const lineItemsList = transaction.lineItems.map((l) => ({
                name: l.name,
                qty: l.qty,
                lineTotal: l.lineTotal,
            }));
            const result = await uploadFn(prisma, transaction, paymentsList, lineItemsList);
            if (!result.ok) {
                throw new Error(result.error ?? "Upload failed");
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
