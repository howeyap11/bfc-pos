import type { FastifyInstance } from "fastify";
import { syncCatalogFromCloud } from "./syncCatalog.service";
import { processTransactionSyncOutbox } from "./outbox.service";
import { uploadTransactionToCloud } from "./transactionSync.service";

let catalogInFlight = false;
let transactionFlushInFlight = false;

let lastCatalogSyncAt = 0;
let lastCatalogSyncOk = true;
let lastCatalogSyncError: string | null = null;

export function getSyncStatus(): {
  status: "ok" | "degraded" | "unknown";
  lastSyncAt: number | null;
  lastError: string | null;
} {
  if (lastCatalogSyncAt === 0) return { status: "unknown", lastSyncAt: null, lastError: null };
  return {
    status: lastCatalogSyncOk ? "ok" : "degraded",
    lastSyncAt: lastCatalogSyncAt,
    lastError: lastCatalogSyncError,
  };
}

export async function runCatalogSync(app: FastifyInstance): Promise<void> {
  if (catalogInFlight) return;
  catalogInFlight = true;
  try {
    const outcome = await syncCatalogFromCloud(app.prisma, "default");
    lastCatalogSyncAt = Date.now();
    if (outcome.ok) {
      lastCatalogSyncOk = true;
      lastCatalogSyncError = null;
      app.log.info({ result: outcome.result }, "Catalog sync completed");
    } else {
      lastCatalogSyncOk = false;
      lastCatalogSyncError = outcome.error ?? "Sync failed";
      app.log.warn({ error: outcome.error, code: outcome.code }, "Catalog sync failed");
    }
  } catch (err) {
    lastCatalogSyncAt = Date.now();
    lastCatalogSyncOk = false;
    lastCatalogSyncError = err instanceof Error ? err.message : String(err);
    app.log.warn({ err, message: lastCatalogSyncError }, "Catalog sync error");
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
    const msg = err instanceof Error ? err.message : String(err);
    app.log.warn({ err, message: msg }, "Transaction sync flush error");
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
