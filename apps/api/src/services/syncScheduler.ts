import type { FastifyInstance } from "fastify";
import { syncCatalogFromCloud } from "./syncCatalog.service";
import { processTransactionSyncOutbox, getTransactionSyncOutboxStatus } from "./outbox.service";
import { uploadTransactionToCloud } from "./transactionSync.service";
import { cleanupStaleMenuImages } from "./menuImageCache.service";
import { isOnline } from "./connectivity.service";
import { syncOwnerPasswordHash } from "./ownerPassword.service";
import { processStaffOpsOutbox } from "./staffOpsSync.service";
import { syncStaffOpsReferenceData } from "./staffOpsPull.service";

let catalogInFlight = false;
let transactionFlushInFlight = false;

let lastCatalogSyncAt = 0;
let lastCatalogSyncOk = true;
let lastCatalogSyncError: string | null = null;

// Connectivity state for transaction sync
let lastOnlineStatus: boolean | null = null;
let lastOfflineLogAt = 0;
const OFFLINE_LOG_INTERVAL_MS = 5 * 60 * 1000; // Log "offline" at most once per 5 min

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

const OWNER_PASSWORD_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export async function runOwnerPasswordSync(app: FastifyInstance): Promise<void> {
  try {
    await syncOwnerPasswordHash(app.prisma, app.log);
  } catch (err) {
    app.log.warn({ err }, "[OwnerPassword] Sync error");
  }
}

export async function runCatalogSync(app: FastifyInstance): Promise<void> {
  if (catalogInFlight) return;
  catalogInFlight = true;
  app.log.info("runCatalogSync: started");
  try {
    app.log.info("runCatalogSync: calling syncCatalogFromCloud");
    const outcome = await syncCatalogFromCloud(app.prisma, "default");
    lastCatalogSyncAt = Date.now();
    if (outcome.ok) {
      lastCatalogSyncOk = true;
      lastCatalogSyncError = null;
      app.log.info({ result: outcome.result }, "Catalog sync completed");
      await syncStaffOpsReferenceData(app.prisma).catch((err) => {
        app.log.warn({ err }, "Staff ops reference sync failed");
      });
      try {
        const activeItems = await app.prisma.cloudMenuItem.findMany({
          where: { storeId: "store_1", isActive: true, deletedAt: null },
          select: { cloudId: true },
        });
        const removed = await cleanupStaleMenuImages(activeItems.map((i) => i.cloudId));
        if (removed > 0) app.log.info({ removed }, "Menu image cache: cleaned stale entries");
      } catch (err) {
        app.log.warn({ err }, "Menu image cache cleanup failed");
      }
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

/** Returns true if flush ran (online), false if skipped (offline). */
export async function runTransactionSyncFlush(app: FastifyInstance): Promise<boolean> {
  if (transactionFlushInFlight) return false;
  if (catalogInFlight) return false;

  const online = await isOnline();
  const now = Date.now();

  const isReconnect = lastOnlineStatus === false && online;
  if (isReconnect) {
    app.log.info("Internet restored: triggering sync burst");
    runOwnerPasswordSync(app).catch(() => {});
  }
  lastOnlineStatus = online;

  if (!online) {
    if (now - lastOfflineLogAt >= OFFLINE_LOG_INTERVAL_MS) {
      app.log.info("Sync paused: offline");
      lastOfflineLogAt = now;
    }
    return false;
  }

  transactionFlushInFlight = true;
  try {
    let totalProcessed = 0;
    const maxCycles = isReconnect ? RECONNECT_BURST_MAX_CYCLES : 1;

    for (let cycle = 0; cycle < maxCycles; cycle++) {
      const { processed, succeeded, failed } = await processTransactionSyncOutbox(
        app.prisma,
        uploadTransactionToCloud,
        20,
        app.log
      );
      totalProcessed += processed;
      if (processed > 0) {
        app.log.info({ cycle: cycle + 1, processed, succeeded, failed }, "Transaction sync outbox processed");
      }
      if (processed === 0) break;
      const { pendingCount } = await getTransactionSyncOutboxStatus(app.prisma);
      if (pendingCount === 0) break;
    }
    const staffOps = await processStaffOpsOutbox(app.prisma, 20);
    if (staffOps.processed > 0) {
      app.log.info({ staffOps }, "Staff ops outbox processed");
    }
    await processStaffOpsOutbox(app.prisma, 20);

    if (isReconnect && totalProcessed > 0) {
      app.log.info({ totalProcessed }, "Reconnect sync burst complete");
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    app.log.warn({ err, message: msg }, "Transaction sync flush error");
    return true; // We attempted, so counts as ran
  } finally {
    transactionFlushInFlight = false;
  }
}

const TX_FLUSH_INTERVAL_EMPTY_MS = 30 * 1000;   // 30s when queue empty
const TX_FLUSH_INTERVAL_PENDING_MS = 5 * 1000;  // 5s when queue has items
const TX_FLUSH_INTERVAL_OFFLINE_MS = 10 * 1000; // 10s when offline (detect reconnect)
const RECONNECT_BURST_MAX_CYCLES = 8;           // Max sync cycles on reconnect to clear backlog

function scheduleNextTransactionFlush(app: FastifyInstance): void {
  const delay = (async () => {
    const ran = await runTransactionSyncFlush(app);
    if (ran) {
      const { pendingCount } = await getTransactionSyncOutboxStatus(app.prisma);
      return pendingCount > 0 ? TX_FLUSH_INTERVAL_PENDING_MS : TX_FLUSH_INTERVAL_EMPTY_MS;
    }
    return TX_FLUSH_INTERVAL_OFFLINE_MS;
  })();
  delay.then((d) => {
    setTimeout(() => scheduleNextTransactionFlush(app), d);
  }).catch((err) => {
    app.log.warn({ err }, "Transaction flush scheduling error");
    setTimeout(() => scheduleNextTransactionFlush(app), TX_FLUSH_INTERVAL_EMPTY_MS);
  });
}

export function startSyncScheduler(app: FastifyInstance): void {
  app.log.info("Cloud sync scheduler starting: catalog every 5min, transaction (connectivity-aware), owner password periodic");
  // Owner password sync: on startup, then every 5 min
  runOwnerPasswordSync(app).catch(() => {});
  setInterval(() => runOwnerPasswordSync(app), OWNER_PASSWORD_SYNC_INTERVAL_MS);
  // Catalog sync every 5 min
  setInterval(() => runCatalogSync(app), 5 * 60 * 1000);
  // Transaction flush: connectivity-aware, runs immediately then on dynamic interval
  scheduleNextTransactionFlush(app);
  app.log.info("Sync scheduler started: catalog every 5min, transaction flush connectivity-aware");
}
