# BFC POS Booth Offline Emergency Fix – Audit

## Summary

| Issue | Root Cause | Files | Fix |
|-------|------------|-------|-----|
| 1. Printing blocked offline | `isQueuedOffline` (transactionNo<=0) disables buttons; queued tx never in DB so API print 404s | pos-register-client.tsx | Remove gate; add client-side print from local data |
| 2. Cloud unreachable banner | HealthGateReady shows `⚠ {sync.lastError}` when runtimeStatus===degraded | health-gate.tsx | Stop rendering degraded banner on main POS |
| 3. Sync queue on Register | Rendered in Current Order panel | pos-register-client.tsx, transactions-client.tsx | Remove from Register, add to Transactions |
| 4. Offline tx not in list | navigator.onLine causes queue path; tx only in localStorage; list reads API/DB | pos-register-client.tsx, transactions-client.tsx | Try API first; merge queue into Transactions list |

---

## 1. Print Gating

**Root cause**: `isQueuedOffline = transaction.transactionNo <= 0` disables Receipt/Sticker. When `navigator.onLine` is false, payment uses `queueOfflineTransactionSync` → transaction stays in localStorage with transactionNo: 0, never in API. Print endpoints lookup by id → 404.

**Fix**:
- Remove `isQueuedOffline` gate from print buttons.
- When `isQueuedOffline`: use client-side print (convert `lastCompletedTransaction` + CartItem[] to ReceiptTransaction, call `printReceipt` / `printSticker` from printHelpers).
- When not queued: keep existing API print flow.
- Add `cartToReceiptTransaction()` helper to map CartItem[] → ReceiptTransaction.

---

## 2. Cloud Unreachable Banner

**Root cause**: `HealthGateReady` in health-gate.tsx renders a top banner when `systemStatus?.runtimeStatus === "degraded"`. Message comes from `sync.lastError` (e.g. "Cloud unreachable: fetch failed").

**Fix**: In HealthGateReady, always return `<>{children}</>` and do not render the degraded banner. Status can move to Settings if needed later.

---

## 3. Sync Queue Location

**Root cause**: "Offline sync queue: X pending" is in pos-register-client.tsx (lines 4816–4820) in the Current Order panel.

**Fix**:
- Remove that block from pos-register-client.tsx.
- In transactions-client.tsx, use `getSyncQueueItems().length` and show the sync queue info in a non-intrusive spot (e.g. near date filter or summary).

---

## 4. Offline Transactions in List

**Root cause**:
- Payment flow checks `navigator.onLine` and, when false, calls `queueOfflineTransactionSync` instead of the API.
- Transactions tab loads from `/api/pos/transactions/list` → backend Prisma. Queued transactions are never in DB.
- Booth setup: web + API on same machine; localhost works even when `navigator.onLine` is false.

**Fix**:
- **Primary**: Try API first; only queue when the API request fails. This keeps most offline transactions in the local DB and makes them appear in the list.
- **Secondary**: Merge queued items from `getSyncQueueItems()` into the Transactions list as "Pending sync" rows so they appear even when API is truly unreachable.

---

## Files Touched

| File | Changes |
|------|---------|
| `apps/web/src/app/pos/register/pos-register-client.tsx` | Remove isQueuedOffline gate; add client-side print path; try API before queue; remove sync queue UI |
| `apps/web/src/app/pos/health-gate.tsx` | Do not render degraded banner |
| `apps/web/src/app/pos/transactions/transactions-client.tsx` | Add sync queue badge; merge queue into list; add pendingSyncCount |
| `apps/web/src/lib/printHelpers.ts` | Add `cartToReceiptTransaction` helper (or equivalent conversion) |
