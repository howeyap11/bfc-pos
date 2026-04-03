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

export type LineItemRecord = {
  name: string;
  qty: number;
  lineTotal: number;
  sourceLineItemId?: string;
  menuItemId?: string | null;
  optionsJson?: string | null;
  consumptionPerUnitByIngredientJson?: string | null;
};

export type RefundRecord = {
  id: string;
  reason: string;
  amountCents: number;
  createdAt: string;
  items?: Array<{
    sourceLineItemId: string;
    qtyRefunded: number;
    amountRefundedCents: number;
  }>;
};

/** Shared shape: payment + line + refund includes for cloud sync (immediate + outbox). */
export type TransactionForCloudSync = {
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
  payments: Array<{ method: string; amountCents: number }>;
  lineItems: Array<{
    id: string;
    name: string;
    qty: number;
    lineTotal: number;
    optionsJson: string | null;
    consumptionPerUnitByIngredientJson: string | null;
    item: { cloudId: string | null } | null;
  }>;
  refunds: Array<{
    id: string;
    reason: string;
    createdAt: Date;
    refundItems: Array<{
      transactionLineItemId: string;
      qtyRefunded: number;
      amountRefundedCents: number;
    }>;
  }>;
};

export function buildCloudSyncListsFromTransaction(transaction: TransactionForCloudSync): {
  paymentsList: PaymentRecord[];
  lineItemsList: LineItemRecord[];
  refundAmountCents: number;
  refundsList: RefundRecord[];
} {
  const paymentsList = transaction.payments.map((p) => ({ method: p.method, amountCents: p.amountCents }));
  const lineItemsList = transaction.lineItems.map((l) => ({
    name: l.name,
    qty: l.qty,
    lineTotal: l.lineTotal,
    sourceLineItemId: l.id,
    menuItemId: l.item?.cloudId ?? null,
    optionsJson: l.optionsJson ?? null,
    consumptionPerUnitByIngredientJson: l.consumptionPerUnitByIngredientJson ?? null,
  }));

  let refundAmountCents = 0;
  const refundsList: RefundRecord[] = [];
  for (const r of transaction.refunds) {
    const amount = r.refundItems.reduce((s, ri) => s + ri.amountRefundedCents, 0);
    refundAmountCents += amount;
    refundsList.push({
      id: r.id,
      reason: r.reason,
      amountCents: amount,
      createdAt: r.createdAt.toISOString(),
      items: r.refundItems.map((ri) => ({
        sourceLineItemId: ri.transactionLineItemId,
        qtyRefunded: ri.qtyRefunded,
        amountRefundedCents: ri.amountRefundedCents,
      })),
    });
  }

  return { paymentsList, lineItemsList, refundAmountCents, refundsList };
}

export type TransactionSyncPayload = {
  tx: TxRecord;
  payments: PaymentRecord[];
  lineItems: LineItemRecord[];
  refundAmountCents?: number;
  refunds?: RefundRecord[];
};

/**
 * Upload transaction to cloud sync endpoint.
 * POST to {CLOUD_URL}/sync/transactions with X-Store-Sync-Key header.
 * Includes refund data when provided for reconciliation.
 * Returns { ok, status?, error? }.
 */
export async function uploadTransactionToCloud(
  prisma: PrismaClient,
  tx: TxRecord,
  payments: PaymentRecord[],
  lineItems: LineItemRecord[],
  options?: { refundAmountCents?: number; refunds?: RefundRecord[] }
): Promise<{ ok: true } | { ok: false; status?: number; error?: string }> {
  if (!CLOUD_URL?.trim()) {
    return { ok: false, error: "CLOUD_URL not configured" };
  }

  const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/transactions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (STORE_SYNC_SECRET) headers["X-Store-Sync-Key"] = STORE_SYNC_SECRET;

  const config = await prisma.storeConfig.findUnique({
    where: { storeId: tx.storeId },
    select: { devMode: true },
  }).catch(() => null);
  const isTest = config?.devMode ?? false;

  const refundAmountCents = options?.refundAmountCents ?? 0;
  const refunds = options?.refunds ?? [];

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
    isTest,
    refundAmountCents,
    refunds: refunds.length > 0 ? refunds : [],
  };

  try {
    console.log("[TransactionSync] Upload attempt", {
      transactionId: tx.id,
      status: tx.status,
      refundAmountCents,
      refundCount: refunds.length,
    });

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

    const bodySummary = res.ok ? "ok" : (await res.text().catch(() => "")).slice(0, 200);

    if (!res.ok) {
      console.warn("[TransactionSync] Upload failed", {
        transactionId: tx.id,
        status: res.status,
        bodySummary,
      });
      return { ok: false, status: res.status, error: bodySummary || `HTTP ${res.status}` };
    }

    console.log("[TransactionSync] Synced", { transactionId: tx.id });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[TransactionSync] Upload error", { transactionId: tx.id, error: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Unified money-event sync: attempt upload immediately; enqueue on failure.
 * Used by payment complete, void, and refund endpoints.
 * Never blocks; never loses events.
 */
export async function syncTransactionToCloudOrEnqueue(
  prisma: PrismaClient,
  transactionId: string,
  log?: { info: (msg: string, meta?: object) => void; warn: (msg: string, meta?: object) => void }
): Promise<{ ok: boolean }> {
  const logger = log ?? { info: (m: string, meta?: object) => console.log("[TransactionSync]", m, meta ?? {}), warn: (m: string, meta?: object) => console.warn("[TransactionSync]", m, meta ?? {}) };

  const { enqueueOutbox } = await import("./outbox.service");

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      payments: true,
      lineItems: { include: { item: { select: { cloudId: true } } } },
      refunds: { include: { refundItems: true } },
    },
  });

  if (!transaction) {
    logger.warn("Transaction not found for sync", { transactionId });
    return { ok: false };
  }

  const txRecord: TxRecord = {
    id: transaction.id,
    storeId: transaction.storeId,
    transactionNo: transaction.transactionNo,
    status: transaction.status,
    source: transaction.source,
    serviceType: transaction.serviceType,
    totalCents: transaction.totalCents,
    subtotalCents: transaction.subtotalCents,
    discountCents: transaction.discountCents,
    createdAt: transaction.createdAt,
    createdBy: transaction.createdBy,
    voidedAt: transaction.voidedAt,
    voidReason: transaction.voidReason,
  };

  const { paymentsList, lineItemsList, refundAmountCents, refundsList } =
    buildCloudSyncListsFromTransaction(transaction);

  const result = await uploadTransactionToCloud(prisma, txRecord, paymentsList, lineItemsList, {
    refundAmountCents,
    refunds: refundsList,
  });

  if (result.ok) {
    logger.info(refundsList.length > 0 ? "Synced (with refunds)" : "Synced", {
      transactionId,
      ...(refundsList.length > 0 && { refundCount: refundsList.length, refundAmountCents }),
    });
    return { ok: true };
  }

  logger.warn("Upload failed, enqueueing for retry", {
    transactionId,
    error: (result as { error?: string }).error,
    ...(refundsList.length > 0 && { refundCount: refundsList.length }),
  });
  await enqueueOutbox(prisma, {
    storeId: transaction.storeId,
    topic: "transaction.cloud.sync",
    payload: { transactionId },
  });
  return { ok: false };
}
