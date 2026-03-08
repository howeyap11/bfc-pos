# Transaction Success Screen UI Spec (UTAK-Style)

## Purpose
A confirmation screen shown after a transaction is fully paid.

## Route
- /pos/transaction-success?transactionId=<transactionId>

## Data loading
- Loads transaction receipt payload via GET /api/pos/transactions/:id/receipt

## Visual structure
- Success header: checkmark + large total + payment badge
- Receipt details: items list + totals
- Print actions: kitchen/order/sticker/receipt (may be placeholders)
- Navigation: View Transactions, New Transaction

## Badge colors (concept)
- CASH: green
- CARD: orange
- GCASH: blue
- PAYMONGO: purple
- FOODPANDA: pink
- GRABFOOD: green
- BFCAPP: indigo

## Navigation sources
Success screen must be reachable after:
- direct POS payment completion
- split payment completion
- PAYMONGO QR accept
- CASH QR payment completion