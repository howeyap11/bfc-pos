import type { PrismaClient } from "@prisma/client";

export async function enqueueOutbox(
  prisma: PrismaClient,
  params: { storeId: string; topic: string; payload: Record<string, unknown> }
) {
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
export async function processOutboxForTopic(
  prisma: PrismaClient,
  inventoryService: { consumeForSale: (params: {
    storeId: string;
    transactionId: string;
    lineItems: Array<{ itemId: string; qty: number }>;
    createdByStaffId?: string;
  }) => Promise<unknown[]> },
  topic: string,
  maxItems = 10
) {
  const items = await prisma.localOutbox.findMany({
    where: { topic, status: "PENDING" },
    take: maxItems,
    orderBy: { createdAt: "asc" },
  });
  let succeeded = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payloadJson) as Record<string, unknown>;
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
      } else {
        throw new Error(`Unknown topic: ${topic}`);
      }
      await prisma.localOutbox.update({
        where: { id: item.id },
        data: { status: "SENT", attempts: item.attempts + 1 },
      });
      succeeded++;
    } catch (err) {
      await prisma.localOutbox.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          attempts: item.attempts + 1,
          lastError: (err as Error)?.message ?? String(err),
        },
      });
      failed++;
    }
  }
  return { processed: items.length, succeeded, failed };
}
