# Enums and Constants

---

## Store
- `store_1`

---

## Payment Methods (Unified)
- `CASH`
- `CARD`
- `GCASH`
- `PAYMONGO`
- `FOODPANDA`

Notes:
- `GCASH_MANUAL` is deprecated and must never reappear.
- QR orders only support `PAYMONGO` and `CASH`.
- QR UI must display `CASH` as **"Pay at the Counter"**.

---

## Fulfillment (Per-Line)

- `FOR_HERE`
- `TAKE_OUT`
- `FOODPANDA`

Default in Customize Mode: `FOR_HERE`

---

## MilkType

- `FULL_CREAM`
- `OAT`
- `ALMOND`
- `SOY`

Non-default milk adds ₱10 (1000 cents).

---

## ShotsPricingMode

Controls how espresso shots are priced.

- `ESPRESSO_FREE2_PAIR40`
- `PAIR40_NO_FREE`

### ESPRESSO_FREE2_PAIR40
First 2 shots FREE, then ₱40 per 2-shot pair.

### PAIR40_NO_FREE
₱40 per 2-shot pair. No free shots.

---

## ShotsDefaultSource

Controls where default shots come from.

- `MANUAL`
- `INVENTORY` (future)

Currently system uses `MANUAL`.