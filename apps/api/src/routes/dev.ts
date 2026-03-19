// POS dev routes: delete local test transactions
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAdminPin } from "../services/adminPin.service.js";

const STORE_ID = "store_1";

export async function devRoutes(app: FastifyInstance) {
  // POST /dev/delete-test-transactions – delete ONLY local test transactions.
  app.post("/dev/delete-test-transactions", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { pin?: string };
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    if (!pin) {
      return reply.code(400).send({ error: "INVALID_BODY", message: "pin required" });
    }

    const pinResult = await verifyAdminPin(pin, app.prisma);
    if (!pinResult.valid) {
      return reply.code(403).send({ error: "INVALID_ADMIN_PIN", message: "Invalid admin PIN" });
    }

    // Collect IDs first so we can also remove any pending outbox records
    // that would otherwise keep retrying missing test transactions.
    const testTxs = await app.prisma.transaction.findMany({
      where: { storeId: STORE_ID, isTest: true },
      select: { id: true },
    });
    const testTxIdSet = new Set(testTxs.map((t) => t.id));

    if (testTxIdSet.size > 0) {
      const pendingSyncOutbox = await app.prisma.localOutbox.findMany({
        where: { storeId: STORE_ID, topic: "transaction.cloud.sync", status: "PENDING" },
        select: { id: true, payloadJson: true },
      });

      const outboxIdsToDelete = pendingSyncOutbox
        .filter((item) => {
          try {
            const payload = JSON.parse(item.payloadJson) as { transactionId?: unknown };
            const transactionId = payload?.transactionId;
            return typeof transactionId === "string" && testTxIdSet.has(transactionId);
          } catch {
            return false;
          }
        })
        .map((item) => item.id);

      if (outboxIdsToDelete.length > 0) {
        await app.prisma.localOutbox.deleteMany({
          where: { id: { in: outboxIdsToDelete } },
        });
      }
    }

    const deleted = await app.prisma.transaction.deleteMany({
      where: {
        storeId: STORE_ID,
        isTest: true,
      },
    });

    app.log.info(
      { storeId: STORE_ID, deletedCount: deleted.count, testTxCount: testTxs.length, adminPinSource: pinResult.source },
      "[Dev] Deleted local test transactions"
    );

    // Matches frontend expectation in `settings-client.tsx`
    return { deletedCount: deleted.count };
  });
}
