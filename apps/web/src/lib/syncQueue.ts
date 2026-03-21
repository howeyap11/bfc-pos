"use client";

export type SyncQueueItemType = "transaction" | "refund";
export type SyncQueueStatus = "pending" | "failed";

export type QueuedTransactionPayload = {
  transactionId: string;
  transactionBody: Record<string, unknown>;
  payments: Array<{ method: string; amountCents: number }>;
  staffKey?: string;
};

export type SyncQueueItem = {
  id: string;
  type: SyncQueueItemType;
  payload: QueuedTransactionPayload;
  status: SyncQueueStatus;
  retries: number;
  lastError?: string;
};

const SYNC_QUEUE_UPDATED_EVENT = "bfc-sync-queue-updated";

/** Dispatches an event so components can refresh their pending count. Call after processSyncQueue. */
export function notifySyncQueueUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_QUEUE_UPDATED_EVENT));
}

export function addSyncQueueUpdatedListener(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SYNC_QUEUE_UPDATED_EVENT, cb);
  return () => window.removeEventListener(SYNC_QUEUE_UPDATED_EVENT, cb);
}

const STORAGE_KEY = "bfc_sync_queue_v1";
export const MAX_SYNC_RETRIES = 5;

function readQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: SyncQueueItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueueSyncItem(item: SyncQueueItem) {
  const queue = readQueue();
  if (queue.some((q) => q.id === item.id)) return;
  queue.push(item);
  writeQueue(queue);
}

export function getSyncQueueItems() {
  return readQueue();
}

let syncInProgress = false;

async function processTransaction(item: SyncQueueItem) {
  const payload = item.payload;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (payload.staffKey?.trim()) {
    headers["x-staff-key"] = payload.staffKey.trim();
  }

  const txRes = await fetch("/api/pos/transactions", {
    method: "POST",
    headers,
    body: JSON.stringify(payload.transactionBody),
  });
  if (!txRes.ok) {
    throw new Error(`Transaction sync failed (${txRes.status})`);
  }
  const createdTx = await txRes.json();
  const transactionId = createdTx?.id as string | undefined;
  if (!transactionId) {
    throw new Error("Transaction sync failed (missing created transaction id)");
  }

  for (const payment of payload.payments) {
    const payRes = await fetch(`/api/pos/transactions/${transactionId}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payment),
    });
    if (!payRes.ok) {
      throw new Error(`Payment sync failed (${payRes.status})`);
    }
  }
}

export async function processSyncQueue() {
  if (typeof window === "undefined") return;
  if (syncInProgress) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Sync] Skipped: sync already in progress");
    }
    return;
  }
  const queue = readQueue();
  if (!queue.length) return;

  syncInProgress = true;
  const wasOnline = navigator.onLine;
  if (process.env.NODE_ENV === "development") {
    console.log("[Sync] Starting", { queueSize: queue.length, navigatorOnLine: wasOnline });
  }

  try {
    const nextQueue: SyncQueueItem[] = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.retries >= MAX_SYNC_RETRIES) {
        nextQueue.push({ ...item, status: "failed" });
        if (process.env.NODE_ENV === "development") {
          console.log("[Sync] Item skipped (max retries)", { id: item.id, retries: item.retries });
        }
        continue;
      }
      try {
        if (item.type === "transaction") {
          await processTransaction(item);
          if (process.env.NODE_ENV === "development") {
            console.log("[Sync] Item synced", { id: item.id, type: item.type });
          }
          // success -> remove from queue (don't push to nextQueue)
        } else {
          throw new Error(`Unsupported sync item type: ${item.type}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const retries = item.retries + 1;
        nextQueue.push({
          ...item,
          retries,
          status: retries >= MAX_SYNC_RETRIES ? "failed" : "pending",
          lastError: errMsg,
        });
        if (process.env.NODE_ENV === "development") {
          console.warn("[Sync] Item failed", { id: item.id, retries, error: errMsg });
        }
      }
    }
    writeQueue(nextQueue);
    notifySyncQueueUpdated();
  } finally {
    syncInProgress = false;
  }
}

