## Documentation Contract

This file is the single source of truth for all POS Register behavior.

If any other documentation conflicts with this file:
- This file wins.

All changes to payment flow, QR integration, staff gating, item configuration, pricing, or checkout logic
must be reflected here first.

# POS Register Spec (Single Source of Truth)

This document is the authoritative specification for the **POS Register** and its integration with **QR Orders**.

---

## Scope

In scope:
- Local-first POS register behavior (browse → customize → cart → transaction → payment → success)
- Staff login gating for payment actions
- Store-configurable POS payment modes (per store)
- Split payments
- QR order acceptance integration (PAYMONGO vs CASH)
- Item customization panel behavior (major options, add-ons, milk, shots, notes)
- Fulfillment per line (FOR_HERE / TAKE_OUT / FOODPANDA)
- Foodpanda surcharge (per item; editable in admin)
- Transaction Success screen navigation contract

Out of scope:
- Cloud sync / multi-store sync
- Remote ordering admin dashboards
- Printer hardware integration
- Flutter app implementation details

---

## System Constraints (Must Not Change)

- Local-first deployment (single HP ProDesk)
- Fastify + Prisma backend
- Next.js frontend
- SQLite database
- Single-store (`store_1`)
- No cloud
- Embedded staff login in cart header (UTAK-style)
- QR payment methods: `PAYMONGO` or `CASH`
- POS payment methods configurable via StoreConfig
- `GCASH_MANUAL` must never reappear
- QR UI must display `CASH` as **"Pay at the Counter"**

---

## Terminology

- Browse Mode — category/item browsing
- Customize Mode — item configuration panel
- Cart — client-side configured line items
- Transaction — persisted transaction (formerly "Sale")
- TransactionPayment — payment entries (single or split)
- QR Order — order created from QR flow
- Accept — converts QR order into transaction or loads cart

---

## Architecture Overview

Cart remains client-side until checkout.

Core endpoints:

- `POST /pos/transactions`
- `POST /pos/transactions/:id/payments`
- `GET /pos/transactions/:id/receipt`
- `POST /qr/orders/:id/accept`
- `GET /store-config`
- `GET /items/:id`

---

## RegisterSession (Currently Optional)

RegisterSession is **optional** in the current implementation.

**Current Rule:**
- Staff login (cashier PIN) is sufficient to process transactions.
- Transactions can be created without an open RegisterSession.
- If a RegisterSession is open, transactions are linked to it for future reconciliation.
- If no RegisterSession is open, transactions proceed normally with `registerSessionId = null`.

**Purpose of RegisterSession:**
- Cash reconciliation (opening cash, closing cash, variance reporting)
- Shift management
- Cash drawer accountability

**Future Implementation:**
- RegisterSession enforcement will be enabled when the cash reconciliation module is implemented.
- At that time, `POST /pos/transactions` will require an open RegisterSession.
- The enforcement check is currently commented out in the backend with a TODO marker.

**Register Routes (Still Available):**
- `POST /register/open` — Opens a new register session
- `POST /register/close` — Closes current session (requires open session)
- `GET /register/current` — Returns current open session or null

---

## Staff Login Gating

Browsing and cart editing are always allowed.

Payment actions require active staff.

Blocked without staff:
- Payment button clicks
- Split modal charge
- Transaction creation
- Payment creation

Staff stored in:
```json
{ "id": "...", "name": "Andrea", "role": "ADMIN" }