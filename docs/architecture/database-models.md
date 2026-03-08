# Database Models (High-Level)

This describes structural models relevant to POS + QR.

---

## Store
- id: `store_1`

---

## Staff
- store-scoped
- passcode validated server-side
- isActive controls visibility

---

## StoreConfig
- enabledPaymentMethods (JSON array)
- splitPaymentEnabled (boolean)

---

## Item

### Milk
- defaultMilk: MilkType (default FULL_CREAM)

---

### Foodpanda Surcharge
- foodpandaSurchargeCents: Int (default 2000)

Applies only when fulfillment = FOODPANDA.

---

### Espresso Shot Configuration

Fields:

- supportsShots: Boolean (default false)
- shotsPricingMode: ShotsPricingMode? (null = no shots support)
- defaultShots12oz: Int (default 0)
- defaultShots16oz: Int (default 0)
- shotsDefaultSource: ShotsDefaultSource (default MANUAL)
- defaultEspressoShots: Int (legacy, deprecated)

Rules:

- `supportsShots = true` → show shots UI
- `supportsShots = false` → hide shots section
- `shotsPricingMode` controls pricing formula
- Per-size defaults used when customization opens
- When size changes:
  - If cashier has NOT manually adjusted shots → auto-update
  - If manually adjusted → preserve user value

Future:
When `shotsDefaultSource = INVENTORY`,
defaults are computed from Recipe model.

---

## Order (QR)
- paymentMethod: PAYMONGO or CASH
- accepted later by cashier

---

## Transaction
- created at checkout
- may link to Order

---

## SaleLineItem
- fulfillment per line
- includes milk, shots, modifiers, surcharge

---

## SalePayment
- supports multiple entries (split)