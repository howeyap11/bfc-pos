import type { SyncedTransactionRow } from "@/lib/api";

const DEFAULT_DEV_INGEST = "http://127.0.0.1:7328/ingest/4412edb8-6093-4552-97f7-a28d77cc8a0f";

/** Optional ingest URL: set at build/deploy for smoke-testing /transactions (`NEXT_PUBLIC_BFC_TX_DEBUG_INGEST_URL`). */
function resolveUiIngestUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BFC_TX_DEBUG_INGEST_URL?.trim();
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "development" ? DEFAULT_DEV_INGEST : "";
}

/** Fire-and-forget: browser hits ingest (works when Cursor/log collector runs on operator machine). */
export function postTransactionsTabClientVerify(kind: string, rows: SyncedTransactionRow[]): void {
  const url = resolveUiIngestUrl();
  if (!url) return;

  const sessionId = process.env.NEXT_PUBLIC_BFC_TX_DEBUG_SESSION?.trim();

  try {
    const first = rows[0];
    const withRefundIdx = rows.findIndex((tx) => (tx.refunds?.length ?? 0) > 0 || (tx.refundAmountCents ?? 0) > 0);
    const refunded = withRefundIdx >= 0 ? rows[withRefundIdx] : null;

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionId ? { "X-Debug-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({
        ...(sessionId ? { sessionId } : {}),
        hypothesisId: "cloud-ui-tx-verify",
        location: `cloud-ui TransactionsContent ${kind}`,
        message: "client received transaction list payload",
        runId: "deploy-verify",
        data: {
          count: rows.length,
          firstKeys: first ? Object.keys(first) : [],
          firstHasRefundFields: first
            ? {
                refundAmountCents: "refundAmountCents" in first,
                netTotalCents: "netTotalCents" in first,
                refunds: "refunds" in first,
              }
            : null,
          refundedRowSample: refunded
            ? {
                index: withRefundIdx,
                refundAmountCents: refunded.refundAmountCents,
                refundsLength: refunded.refunds?.length ?? 0,
                firstLineHasSourceId: Boolean(refunded.lineItems?.[0]?.sourceLineItemId),
              }
            : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
