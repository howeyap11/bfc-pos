# Payment Modes Configuration (StoreConfig)

## Goal
Allow admins to configure which POS payment buttons appear in POS Register per store.

## Data source
StoreConfig is stored locally in SQLite.

Expected StoreConfig payload:
```json
{
  "storeId": "store_1",
  "enabledPaymentMethods": ["CASH", "CARD", "GCASH", "FOODPANDA"],
  "splitPaymentEnabled": true,
  "paymentMethodOrder": null
}