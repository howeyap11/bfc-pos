# Inventory Layer Architecture

## 1. Codebase Summary

### Current State

**cloud-api (PostgreSQL)**
- `Ingredient`: name, unitCode, categoryId, sortOrder, imageUrl. No department, trackingType, quick units.
- `RecipeLine`, `RecipeLineSize`: menu item → ingredient consumption (qtyPerItem, unitCode).
- `StockMovement`: ingredientId, locationType (STORE|WAREHOUSE string), quantityDeltaBaseUnit, sourceType, sourceId. Append-only ledger.
- Inventory page: GET /admin/inventory/stock computes SUM(quantityDeltaBaseUnit) by ingredient + locationType.

**apps/api (SQLite, store-local)**
- Separate `Ingredient`, `IngredientStock`, `InventoryMovement` (store-scoped).
- `consumeForSale` posts CONSUMPTION to `InventoryMovement` when transaction is PAID.
- Recipe consumption via `MenuItemRecipe`, `MenuItemRecipeSize` (synced from cloud catalog).

**Where sales deduct:** apps/api only. cloud-api has no sale/order finalization. Integration with cloud (sync sale deductions) is a follow-up.

## 2. Architecture Decision

**Extend Ingredient directly.** No separate inventory_items table. Ingredient remains the stock-tracked entity.

**Why:**
- Recipe already references Ingredient 1:1.
- cloud-api StockMovement already links to Ingredient.
- Adding department, trackingType, quick units to Ingredient is the smallest change.
- A parallel inventory_items table would add complexity and sync drift.

## 3. Schema Changes

### Enums
- `InventoryDepartment`: BAR, KITCHEN, PASTRY, SHARED
- `InventoryTrackingType`: VOLATILE, EXACT, COUNT_ONLY
- `InventoryLocationType`: WAREHOUSE, STORE, EVENT, POPUP
- `StockMovementType`: OPENING, SALE_DEDUCTION, PURCHASE_ADD, WASTE, TRANSFER_OUT, TRANSFER_IN, RECONCILIATION_VARIANCE, MANUAL_ADJUSTMENT, REVERSAL
- `StockTransferStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED
- `InventoryReconciliationStatus`: DRAFT, SUBMITTED, APPROVED
- `WasteReasonCode`: SPILL, REMAKE, EXPIRED, DAMAGED, TESTING, OTHER

### New / Extended Models

**Ingredient (extend)**
- department: InventoryDepartment? (optional for backward compat)
- trackingType: InventoryTrackingType? (default EXACT)
- quickCountUnitName: String?
- quickCountUnitToBase: Decimal?
- warehouseUnitName: String?
- warehouseUnitToBase: Decimal?

**InventoryLocation (new)**
- id, code, name, locationType, isActive, sortOrder, createdAt, updatedAt
- Seeded: MAIN_CAFE (STORE), WAREHOUSE; others added via admin.

**StockMovement (migrate)**
- Replace locationType string with locationId FK to InventoryLocation
- Add: movementType (StockMovementType), actorStaffId?, approvedByStaffId?, notes?, businessDate?
- Keep: sourceType, sourceId for idempotency (e.g. SALE + transactionId)

**StockTransfer, StockTransferLine**
- Transfer between locations; approval posts TRANSFER_OUT + TRANSFER_IN.

**InventoryReconciliation, InventoryReconciliationLine**
- Per location, per business date. theoretical vs actual → RECONCILIATION_VARIANCE.

## 4. Multi-Location Support

- Each StockMovement has locationId. Stock = SUM(delta) per ingredient + locationId.
- Transfers: fromLocationId → toLocationId. Two movements (OUT at source, IN at dest).
- Sales: deductions post to the selling location (locationId). Integration: when apps/api finalizes a sale, it can call cloud-api to post SALE_DEDUCTION for the selling location (e.g. MAIN_CAFE or KAAMULAN).
- Reconciliations: per location, per date.

## 5. File-by-File Plan

| Phase | Files | Status |
|-------|-------|--------|
| A | prisma/schema.prisma, prisma/migrations/20260312000000_inventory_layer_foundation | Done |
| B | src/services/inventory.service.ts, src/plugins/inventory.ts, admin routes | Done |
| C | admin routes: transfers, reconciliations, locations | Done |
| D | cloud-ui inventory page (location-aware) | Deferred |

## 6. Next Steps

1. **Run migration**: `pnpm prisma migrate deploy` (or `prisma migrate dev` after resolving DB drift)
2. **Generate client**: `pnpm prisma generate` (close any process locking the Prisma DLL first)
3. **Integrate sale deduction**: When apps/api finalizes a sale, call cloud-api to post SALE_DEDUCTION (webhook or sync service)
4. **Add location to sale context**: Ensure selling location (MAIN_CAFE, KAAMULAN, etc.) is passed when posting deductions
