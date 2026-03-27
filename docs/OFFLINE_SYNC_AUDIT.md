# Offline-to-Cloud Sync Audit

## PHASE 1: AUDIT REPORT

### Root Causes

| Issue | Root cause |
|-------|------------|
| Refunds never sync | Refund endpoint does not call `uploadTransactionToCloud` or `enqueueOutbox` |
| Refund data missing in cloud | `transactionSync.service` payload has no refund fields; cloud `SyncedTransaction` has no refund columns |
| FAILED items never retry | `processTransactionSyncOutbox` only processes PENDING; FAILED items are never reprocessed |
| No backoff | Retries are immediate (every 30s); no exponential backoff; 10 failures = permanent FAILED |
| Backfill skips FAILED | `backfillTransactionSyncOutbox` only enqueues PAID/VOID not in SENT/PENDING; does not recover FAILED |
| No startup flush | Transaction sync flush runs on 30s interval only; no immediate run on API startup |

---

### Affected Files

| File | Role |
|------|------|
| `apps/api/src/services/transactionSync.service.ts` | Upload payload builder; no refund data |
| `apps/api/src/services/outbox.service.ts` | enqueueOutbox, processTransactionSyncOutbox, backfillTransactionSyncOutbox; FAILED never retried |
| `apps/api/src/routes/posTransactions.ts` | Payment complete, void, refund endpoints; refund has no sync |
| `apps/api/src/services/syncScheduler.ts` | 30s interval; no startup flush |
| `apps/api/prisma/schema.prisma` | LocalOutbox: status, attempts, lastError; no nextRetryAt |
| `apps/cloud-api/src/routes/sync.ts` | transactionImportSchema, POST /transactions; no refund fields |
| `apps/cloud-api/prisma/schema.prisma` | SyncedTransaction; no refundAmountCents, refundsJson |
| `apps/cloud-api/src/services/dashboard.service.ts` | Uses SyncedTransaction; TODO for refunds |

---

### Outbox Table Schema (LocalOutbox)

```
id, storeId, topic, payloadJson, status (PENDING|SENT|FAILED), attempts, lastError?, createdAt, updatedAt
```

- No `nextRetryAt`
- No SYNCING / in-flight status
- FAILED = dead (never reprocessed)

---

### Scheduler / Worker

- `syncScheduler.ts`: `runTransactionSyncFlush` every 30s
- `processTransactionSyncOutbox`: only `status: "PENDING"`, max 20 items per run
- No transaction flush on API startup

---

### Refund Endpoint & Model

- `POST /pos/transactions/:id/refund` creates `TransactionRefund` + `TransactionRefundItem`
- Returns `updatedTransaction` with refunds
- **No** upload or enqueue call

Refund model: `TransactionRefund { id, transactionId, reason, refundedByStaffId?, refundItems[] }`

---

### Cloud Sync Payload / Schema

**Payload (transactionSync.service):** storeId, sourceTransactionId, transactionNo, status, payments, lineItems, voidedAt, voidReason, isTest. **No refund data.**

**Cloud SyncedTransaction:** sourceTransactionId (idempotency), status, voidedAt, voidReason, paymentsJson, lineItemsSummaryJson. **No refund columns.**

**Import:** Upserts by sourceTransactionId; on existing, updates status, voidedAt, voidReason only.

---

### Retry / Failure Handling

- Upload fails → enqueue with payload `{ transactionId }`
- Outbox processor: on error, `attempts++`, if attempts >= 10 then status=FAILED else PENDING
- FAILED items: **never retried**
- No nextRetryAt, no backoff

---

### Backfill / Manual Retry

- `backfillTransactionSyncOutbox`: scans PAID/VOID transactions, skips those with SENT or PENDING outbox row
- Does **not** reset or requeue FAILED items
- `POST /admin/sync/transactions`: processes PENDING only
- POS Settings: "Backfill cloud transaction sync" button → backfill + flush

---

## IMPLEMENTATION PLAN

### A. Refund sync (Option 1: transaction upsert with refund data)

1. Extend cloud `SyncedTransaction` with `refundAmountCents`, `refundsJson` (optional)
2. Extend cloud `transactionImportSchema` with optional refund fields
3. Extend `uploadTransactionToCloud` to include refund summary
4. Refund endpoint: after create, call shared sync path (upload + enqueue on fail)

### B. Unified sync helper

- `syncTransactionToCloudOrEnqueue(prisma, transactionId, log?)`:
  - Load tx with payments, lineItems, refunds
  - Build full payload (including refund data)
  - Try upload
  - If !ok, enqueue
  - Return result

- Use in: payment complete, void, refund

### C. Outbox strengthening

- Add `nextRetryAt DateTime?` to LocalOutbox (migration)
- When processing: include FAILED items where `nextRetryAt <= now` (or null)
- On failure: set `nextRetryAt = now + backoff(attempts)` instead of permanent FAILED
- Cap backoff at e.g. 1 hour; keep status PENDING for retry
- Optional: add SYNCING for in-flight (simpler: skip for now)

### D. Backfill recovery

- Extend backfill to reset FAILED items: set status=PENDING, nextRetryAt=null (or now) for items we want to retry
- Or: new "recover failed" action that resets FAILED → PENDING

### E. Startup flush

- Run `runTransactionSyncFlush` once on API startup (after scheduler starts, or in parallel)

### F. Logging

- Log: money event created, sync attempt, enqueue, success/failure, retries, lastError, stuck reset
