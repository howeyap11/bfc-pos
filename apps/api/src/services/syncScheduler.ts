import type { FastifyInstance } from "fastify";
import { syncCatalogFromCloud } from "./syncCatalog.service";
import { processTransactionSyncOutbox } from "./outbox.service";
import { uploadTransactionToCloud } from "./transactionSync.service";

let catalogInFlight = false;
let transactionFlushInFlight = false;

export async function runCatalogSync(app: FastifyInstance): Promise<void> {
  if (catalogInFlight) return;
  catalogInFlight = true;
  try {
    const outcome = await syncCatalogFromCloud(app.prisma, "default");
    if (outcome.ok) {
      app.log.info({ result: outcome.result }, "Catalog sync completed");
    } else {
      app.log.warn({ error: outcome.error, code: outcome.code }, "Catalog sync failed");
    }
  } catch (err) {
    app.log.warn({ err }, "Catalog sync error");
  } finally {
    catalogInFlight = false;
  }
}

export async function runTransactionSyncFlush(app: FastifyInstance): Promise<void> {
  if (transactionFlushInFlight) return;
  transactionFlushInFlight = true;
  try {
    const { processed, succeeded, failed } = await processTransactionSyncOutbox(
      app.prisma,
      uploadTransactionToCloud,
      20
    );
    if (processed > 0) {
      app.log.info({ processed, succeeded, failed }, "Transaction sync outbox processed");
    }
  } catch (err) {
    app.log.warn({ err }, "Transaction sync flush error");
  } finally {
    transactionFlushInFlight = false;
  }
}

export function startSyncScheduler(app: FastifyInstance): void {
  // Catalog sync every 5 min
  setInterval(() => runCatalogSync(app), 5 * 60 * 1000);
  // Transaction flush every 30 s
  setInterval(() => runTransactionSyncFlush(app), 30 * 1000);
  app.log.info("Sync scheduler started: catalog every 5min, transaction every 30s");
}
