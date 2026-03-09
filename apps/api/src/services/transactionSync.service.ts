import type { PrismaClient } from "@prisma/client";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const STORE_SYNC_SECRET = process.env.STORE_SYNC_SECRET ?? "";

type TxRecord = {
  id: string;
  storeId: string;
  transactionNo: number;
  status: string;
  source: string;
  serviceType: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  createdAt: Date;
  createdBy: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
};

type PaymentRecord = { method: string; amountCents: number };

type LineItemRecord = { name: string; qty: number; lineTotal: number };

/**
 * Upload transaction to cloud sync endpoint.
 * POST to {CLOUD_URL}/sync/transactions with X-Store-Sync-Key header.
 * Returns { ok, status?, error? }.
 */
export async function uploadTransactionToCloud(
  prisma: PrismaClient,
  tx: TxRecord,
  payments: PaymentRecord[],
  lineItems: LineItemRecord[]
): Promise<{ ok: true } | { ok: false; status?: number; error?: string }> {
  if (!CLOUD_URL?.trim()) {
    return { ok: false, error: "CLOUD_URL not configured" };
  }

  const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/transactions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (STORE_SYNC_SECRET) headers["X-Store-Sync-Key"] = STORE_SYNC_SECRET;

  const payload = {
    storeId: tx.storeId,
    sourceTransactionId: tx.id,
    transactionNo: tx.transactionNo,
    status: tx.status,
    source: tx.source,
    serviceType: tx.serviceType,
    cashierName: tx.createdBy ?? null,
    totalCents: tx.totalCents,
    subtotalCents: tx.subtotalCents,
    discountCents: tx.discountCents,
    itemsCount: lineItems.reduce((s, l) => s + l.qty, 0),
    payments,
    lineItems,
    createdAt: tx.createdAt.toISOString(),
    voidedAt: tx.voidedAt?.toISOString() ?? null,
    voidReason: tx.voidReason ?? null,
  };

  // Temporary debug log
  console.log("[TransactionSync] Transaction queued for cloud sync", { transactionId: tx.id, status: tx.status });

  try {
    // Temporary debug log
    console.log("[TransactionSync] Transaction upload attempt", { transactionId: tx.id, url });

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

    // Temporary debug log
    const bodySummary = res.ok
      ? "ok"
      : (await res.text().catch(() => "")).slice(0, 200);
    console.log("[TransactionSync] Response status/body summary", {
      transactionId: tx.id,
      status: res.status,
      bodySummary,
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: bodySummary || `HTTP ${res.status}` };
    }

    // Temporary debug log
    console.log("[TransactionSync] Transaction marked synced", { transactionId: tx.id });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
