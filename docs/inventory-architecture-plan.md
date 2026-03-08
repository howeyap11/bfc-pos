# Inventory Architecture Plan

## 1. Current State Summary

### Cloud API (apps/cloud-api) — Catalog
- **Ingredient**: `id`, `name`, `unitCode`, `isActive`, `deletedAt`, `version` — catalog entity, no inventory fields
- **RecipeLine** / **RecipeLineSize**: links MenuItem to Ingredient with `qtyPerItem`, `unitCode`, `baseType`, `sizeCode`
- No stock movement or ledger

### Store API (apps/api) — POS
- **Ingredient**: store-scoped, has `unitId`, `storeId`, `sku`, `reorderLevel` — different schema from cloud
- **InventoryMovement**: `storeId`, `ingredientId`, `type` (PURCHASE, CONSUMPTION, WASTAGE, ADJUSTMENT, etc.), `qtyDelta`, `unitId`, `refType`, `refId`
- **IngredientStock**: `ingredientId`, `onHandQty`
- **MenuItemRecipe** / **MenuItemRecipeSize**: store-level recipe (synced from cloud)
- **Sales integration**: When transaction status → PAID, `inventoryService.consumeForSale()` posts CONSUMPTION movements; best-effort, with outbox retry on failure

### Key Findings
1. **Recipe consumption** lives in store API; uses MenuItemRecipe/MenuItemRecipeSize
2. **Finalized sales** post deductions via `consumeForSale` in posTransactions when payment completes
3. **No stock_movements ledger** in cloud; store API has InventoryMovement (similar concept)
4. **Two Ingredient models**: cloud (catalog) vs store (inventory-scoped)

## 2. Architecture Decision: Extend Ingredient vs Separate Inventory Item

**Recommendation: Extend cloud-api Ingredient with inventory metadata.**

- Ingredients, recipes, and stock are anchored to the same catalog entity
- No need for a separate InventoryItem unless warehouse/store ingredients truly diverge
- Store API can keep its own Ingredient (synced from cloud) for POS; cloud remains source of truth for catalog

## 3. Proposed Schema Additions

### 3.1 Cloud API — Ingredient Extensions (already added for P2)
```prisma
model Ingredient {
  // ... existing
  categoryName  String?
  sortOrder     Int       @default(0)
  imageUrl      String?
  // Add for inventory:
  baseUnit           String?   // g, ml, pcs
  trackingType       String?   // FULL, NONE
  reconciliationRequired Boolean @default(false)
  quickCountUnitName  String?
  quickCountConversionToBase Decimal?
  warehouseUnitName   String?
  warehouseUnitConversionToBase Decimal?
}
```

### 3.2 Cloud API — New Tables (defer to Phase 2)

#### stock_movements (append-only ledger)
```prisma
model StockMovement {
  id                    String   @id @default(cuid())
  ingredientId          String
  locationType          String   // WAREHOUSE | STORE
  locationId            String?  // store/warehouse id, nullable for single-store
  movementType          String   // OPENING | SALE_DEDUCTION | PURCHASE_ADD | WASTE | PULL_OUT_OUT | PULL_OUT_IN | RECONCILIATION_VARIANCE | MANUAL_ADJUSTMENT | REVERSAL
  quantityDeltaBaseUnit Decimal
  sourceType            String?  // SALE | PULL_OUT | RECONCILIATION | etc.
  sourceId              String?
  actorStaffId          String?
  approvedByStaffId     String?
  businessDate          DateTime?
  notes                 String?
  createdAt             DateTime @default(now())

  ingredient Ingredient @relation(...)
  @@index([ingredientId, createdAt])
  @@index([sourceType, sourceId])
}
```

#### pull_out_records, pull_out_record_lines
#### inventory_reconciliations, inventory_reconciliation_lines
#### Standardized reason codes (enum or seeded table)

### 3.3 Store API — Align with Ledger
- Map existing `InventoryMovement` types to new `movementType` enum
- Add idempotency: `sourceType` + `sourceId` uniqueness or `posted` flag for SALE_DEDUCTION

## 4. Implementation Phases

### Phase 1 — Inspect & Plan ✅
- [x] Identify Ingredient model (cloud + store)
- [x] Identify recipe consumption (store: MenuItemRecipe/MenuItemRecipeSize)
- [x] Identify sales posting (posTransactions → consumeForSale when PAID)
- [x] Document current schema

### Phase 2 — Schema + Backend Foundation
1. **cloud-api**:
   - Add inventory metadata to Ingredient (baseUnit, trackingType, reconciliationRequired, etc.)
   - Add StockMovement model
   - Add PullOutRecord, PullOutRecordLine
   - Add InventoryReconciliation, InventoryReconciliationLine
   - Add VarianceReasonCode enum/table

2. **apps/api**:
   - Ensure consumeForSale posts with `sourceType=SALE`, `sourceId=transactionId`
   - Add idempotency check (skip if already posted)
   - Optional: sync StockMovement to cloud for reporting

### Phase 3 — Admin/POS Minimal UI
- Ingredient admin: organization + image + inventory fields (P2 done)
- Inventory ledger view
- Current stock view
- Simple pull-out flow
- Simple EOD reconciliation for volatile items

### Phase 4 — Defer
- Staff web purchases with receipt approval
- Staff web waste reports with approval flow

## 5. Integration Rules

1. **Sales**: `consumeForSale` → post SALE_DEDUCTION; idempotent by transactionId
2. **Pull-out**: warehouse decreases, store increases; paired ledger entries; approved immutable
3. **Reconciliation**: EOD variance → RECONCILIATION_VARIANCE; never silent overwrite
4. **Corrections**: reversing entries only; approved movements immutable

## 6. File-by-File Plan (Phase 2)

| File | Action |
|------|--------|
| `apps/cloud-api/prisma/schema.prisma` | Add Ingredient inventory fields, StockMovement, PullOutRecord, InventoryReconciliation |
| `apps/cloud-api/prisma/migrations/` | New migration |
| `apps/cloud-api/src/routes/admin.ts` | Ingredient CRUD: accept new fields |
| `apps/cloud-api/src/routes/inventory.ts` | New: stock movements, pull-out, reconciliation (optional) |
| `apps/api/src/services/inventory.service.ts` | Add idempotency; align movement types |
| `apps/cloud-ui/src/app/inventory/` | New: ledger view, stock view, pull-out form |

## 7. Variance Reason Codes (enum)
- SPILLAGE, SPOILAGE, EXPIRED, OVERPORTION, STAFF_ERROR, COUNT_ERROR, UNKNOWN, OTHER
