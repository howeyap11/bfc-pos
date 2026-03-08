# QR Order Flow (Customer → Cashier → POS)

This document defines the complete QR Order lifecycle and how it integrates with the POS Register.

This document is descriptive. The authoritative behavioral rules remain in `/docs/pos/pos-register-spec.md`.

---

## Overview

QR Orders are created by customers through the QR Menu and later processed by a cashier inside the POS Register.

QR orders are intentionally separated from POS direct sales.

QR payment methods are fixed and NOT configurable.

---

## QR Payment Methods (Fixed)

QR Orders support only:

- `PAYMONGO` — Displayed as **"Pay Online"**
- `CASH` — Displayed as **"Pay at the Counter"**

Important:
- The enum remains `CASH` internally.
- Only the QR UI label changes to "Pay at the Counter".
- Do NOT rename the enum in database, API, or backend.

QR UI must never expose POS payment modes such as:
- CARD
- GCASH
- FOODPANDA
- GRABFOOD
- BFCAPP
- etc.

QR payment methods and POS payment modes must remain strictly separated.

---

## Lifecycle

### 1️⃣ Customer Creates QR Order

Customer:
- Scans table QR
- Adds items
- Selects payment method:
  - PAYMONGO (Pay Online)
  - Pay at the Counter (internally `CASH`)
- Submits order

System:
- Creates `Order` record
- Stores:
  - items
  - paymentMethod
  - paymentStatus
- Order remains pending until cashier action

---

### 2️⃣ Cashier Accepts QR Order

Acceptance happens via:
