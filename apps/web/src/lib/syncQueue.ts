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
};

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
  if (typeof window === "undefined" || !navigator.onLine) return;
  const queue = readQueue();
  if (!queue.length) return;

  const nextQueue: SyncQueueItem[] = [];
  for (const item of queue) {
    if (item.retries >= MAX_SYNC_RETRIES) {
      nextQueue.push({ ...item, status: "failed" });
      continue;
    }
    try {
      if (item.type === "transaction") {
        await processTransaction(item);
      } else {
        throw new Error(`Unsupported sync item type: ${item.type}`);
      }
      // done -> remove from queue
    } catch {
      const retries = item.retries + 1;
      nextQueue.push({
        ...item,
        retries,
        status: retries >= MAX_SYNC_RETRIES ? "failed" : "pending",
      });
    }
  }

  writeQueue(nextQueue);
}

