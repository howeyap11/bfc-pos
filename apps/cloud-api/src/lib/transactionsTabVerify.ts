const DEFAULT_DEV_INGEST = "http://127.0.0.1:7328/ingest/4412edb8-6093-4552-97f7-a28d77cc8a0f";

function resolveIngestUrl(): string | null {
  const fromEnv = process.env.BFC_TX_DEBUG_INGEST_URL?.trim();
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "development" ? DEFAULT_DEV_INGEST : null;
}

type DbTxnRowLite = {
  sourceTransactionId: string;
  refundAmountCents: number | null;
  refundsJson: string | null;
};

/** Fire-and-forget POST for verifying GET /transactions list shape during deploy smoke tests */
export function postTransactionsListVerify(rows: Record<string, unknown>[], rawList: DbTxnRowLite[]): void {
  const ingestUrl = resolveIngestUrl();
  if (!ingestUrl) return;

  const sessionId = process.env.BFC_TX_DEBUG_SESSION?.trim() ?? "cloud-deploy-verify";

  try {
    const rowSample = rows[0];
    const dbSample = rawList[0];
    const refundedRaw = rawList.find((t) => (t.refundAmountCents ?? 0) > 0);
    const refundedRowPayload = refundedRaw
      ? {
          refundAmountCents: refundedRaw.refundAmountCents,
          hasRefundsJson: Boolean(refundedRaw.refundsJson),
          apiRowRefundRelatedKeys: Object.keys(rows.find((r) => r.sourceTransactionId === refundedRaw.sourceTransactionId) ?? {}).filter(
            (k) => /refund/i.test(k)
          ),
        }
      : null;

    const sample = rowSample ?? {};
    fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionId ? { "X-Debug-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({
        ...(sessionId ? { sessionId } : {}),
        hypothesisId: "cloud-tx-verify",
        location: "cloud-api GET /transactions",
        message: "transactions list serialized for UI",
        runId: "deploy-verify",
        data: {
          rowCount: rows.length,
          apiKeysFirst: Object.keys(sample),
          dbRefundAmountFirst: dbSample?.refundAmountCents ?? null,
          dbHasRefundsJsonFirst: Boolean(dbSample?.refundsJson),
          refundedInPageSample: refundedRowPayload,
          hasNetTotalCentsFirst: "netTotalCents" in sample,
          hasRefundsArrayFirst: "refunds" in sample && Array.isArray((sample as { refunds?: unknown }).refunds),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
