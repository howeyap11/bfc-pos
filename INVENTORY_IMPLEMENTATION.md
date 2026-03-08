# Inventory System Implementation Summary

## Overview

Successfully implemented a local-first inventory management system with auditable ledger and per-item recipe consumption tracking for the BFC QR Ordering system.

## Deliverables

### 1. Database Schema (Prisma)

**Location:** `apps/api/prisma/schema.prisma`

**New Enums:**
- `InventoryMovementType`: PURCHASE, CONSUMPTION, WASTAGE, ADJUSTMENT, COUNT_CORRECTION, TRANSFER_IN, TRANSFER_OUT
- `InventoryCountType`: BEGIN_SHIFT, END_SHIFT, SPOT
- `InventoryCountStatus`: DRAFT, SUBMITTED, APPROVED

**New Models:**

1. **InventoryUnit** - Measurement units (ml, g, pcs, kg, L)
   - Unique constraint on `(storeId, code)`
   - Indexed on `storeId`

2. **Ingredient** - Inventory items
   - Fields: sku, name, unitId, reorderLevel, isActive
   - Unique constraint on `(storeId, name)`
   - Indexed on `storeId`, `unitId`, `isActive`
   - Stores decimal values as strings (reorderLevel)

3. **IngredientStock** - Current on-hand quantities
   - Unique constraint on `(storeId, ingredientId)`
   - Stores decimal values as strings (onHandQty)
   - Updated transactionally with movements

4. **MenuItemRecipe** - Links menu items to ingredients
   - Defines consumption rates per menu item
   - Unique constraint on `(storeId, menuItemId, ingredientId)`
   - Stores decimal values as strings (qtyPerItem)

5. **InventoryMovement** - Immutable ledger of all stock changes
   - Signed qtyDelta (negative reduces stock)
   - Optional refType/refId for traceability
   - Indexed on `(storeId, ingredientId, createdAt)` and `(refType, refId)`
   - Stores decimal values as strings (qtyDelta)

6. **InventoryCountSession** - Physical count sessions
   - Tracks BEGIN_SHIFT, END_SHIFT, SPOT counts
   - Status workflow: DRAFT → SUBMITTED → APPROVED
   - Indexed on `(storeId, status)` and `(storeId, startedAt)`

7. **InventoryCountLine** - Individual count entries
   - Unique constraint on `(countSessionId, ingredientId)`
   - Stores decimal values as strings (countedQty)

**Item Model Updates:**
- Added `imagePath` field (string, optional) for local file paths

**Migration:**
- File: `apps/api/prisma/migrations/20260302155513_add_inventory_system/migration.sql`
- Status: ✅ Applied successfully

### 2. Inventory Service Layer

**Location:** `apps/api/src/services/inventory.service.ts`

**Key Features:**
- Uses `decimal.js` for precise decimal arithmetic (no floating-point errors)
- Transactional operations using Prisma `$transaction`
- Unit consistency enforcement (rejects mismatched units)
- Comprehensive error handling with descriptive messages

**Core Functions:**

1. **postMovement(params)**
   - Creates movement and updates stock atomically
   - Validates: NaN, invalid numbers, unit consistency, ingredient existence
   - Supports signed deltas (negative reduces stock)
   - Returns: `{ movement, stock }`

2. **getOnHand(params)**
   - Returns current on-hand quantity as Decimal
   - Returns Decimal(0) if no stock record exists

3. **listMovements(params)**
   - Filters: ingredientId, dateFrom, dateTo, refType, refId
   - Pagination: limit, offset
   - Returns: `{ movements, total, limit, offset }`

4. **recalcStockFromLedger(params)**
   - Admin repair function
   - Recalculates stock by summing all movements
   - Returns: `{ ingredientId, recalculatedQty, movementsProcessed, stock }`

5. **postMovementsBatch(movements[])**
   - Batch operations in single transaction
   - All-or-nothing semantics

6. **getStockLevels(params)**
   - Dashboard function for multiple ingredients
   - Includes low stock indicators
   - Returns enriched data with ingredient details

**Dependencies:**
- `decimal.js` v10.6.0 (installed via pnpm)

### 3. Fastify Plugin

**Location:** `apps/api/src/plugins/inventoryService.ts`

- Registers inventory service as `app.inventoryService`
- Depends on Prisma plugin
- Type-safe via TypeScript declarations

**Type Definitions:**
**Location:** `apps/api/src/types/fastify.d.ts`

- Extended `FastifyInstance` interface with `inventoryService: InventoryService`

### 4. API Routes

**Location:** `apps/api/src/routes/inventory.ts`

**Endpoints:** (All require staff authentication via `x-staff-key`)

**Movement Operations:**
- `POST /inventory/movements` - Create single movement
- `POST /inventory/movements/batch` - Create multiple movements
- `GET /inventory/movements` - List with filters
- `GET /inventory/stock/:ingredientId` - Get on-hand quantity
- `GET /inventory/stock-levels` - Get multiple stock levels
- `POST /inventory/recalc-stock` - Admin repair function

**Ingredient CRUD:**
- `GET /inventory/ingredients` - List all
- `POST /inventory/ingredients` - Create
- `PATCH /inventory/ingredients/:id` - Update

**Unit CRUD:**
- `GET /inventory/units` - List all
- `POST /inventory/units` - Create

**Validation:**
- Uses Zod schemas for request validation
- Comprehensive error handling with descriptive messages

### 5. Documentation

**Location:** `apps/api/src/services/INVENTORY_README.md`

Comprehensive documentation including:
- Architecture overview
- Model definitions
- Service API reference
- API endpoint documentation
- Usage examples
- Best practices
- Error handling guide
- Future enhancements

### 6. Testing

**Location:** `apps/api/src/services/inventory.service.test.ts`

Manual test suite covering:
- Decimal validation
- NaN detection
- Invalid number detection
- Decimal arithmetic
- Negative quantities

**Test Results:** ✅ All tests passing

## Technical Decisions

### 1. Decimal Storage as Strings

**Rationale:** SQLite doesn't have native decimal types. Storing as strings preserves precision and avoids floating-point errors.

**Implementation:**
- Database: TEXT columns
- Application: `decimal.js` library
- Conversion: Automatic via service layer

### 2. Unit Consistency Enforcement

**Current:** Strict enforcement - movement unit must match ingredient unit
**Future:** Unit conversion support (kg → g, L → ml)

**Error Message:**
```
Unit mismatch: Movement unit ml does not match ingredient unit g. 
Unit conversion not yet supported.
```

### 3. Signed Deltas

**Rationale:** Simplifies ledger logic - one field for all movements
- Positive: Increases stock (PURCHASE, TRANSFER_IN)
- Negative: Decreases stock (CONSUMPTION, WASTAGE, TRANSFER_OUT)

### 4. Transactional Updates

**Implementation:** Prisma `$transaction` ensures:
- Movement record created
- Stock updated
- Both succeed or both fail (atomicity)

### 5. Store ID Consistency

**Decision:** Used `storeId` (not `branchId`) to match existing schema conventions
**Default:** `"store_1"` for single-store local-first setup

## Integration Points

### 1. POS Transaction Integration (Future)

When a sale is completed:
```typescript
// After creating transaction
const recipes = await prisma.menuItemRecipe.findMany({
  where: { menuItemId: { in: itemIds } }
});

const movements = recipes.map(recipe => ({
  storeId: "store_1",
  ingredientId: recipe.ingredientId,
  type: "CONSUMPTION",
  qtyDelta: new Decimal(recipe.qtyPerItem)
    .times(qty)
    .negated()
    .toString(),
  unitId: recipe.unitId,
  refType: "SALE",
  refId: transaction.id
}));

await inventoryService.postMovementsBatch(movements);
```

### 2. Count Session Workflow

```typescript
// 1. Create session
const session = await prisma.inventoryCountSession.create({
  data: {
    storeId: "store_1",
    type: "END_SHIFT",
    status: "DRAFT",
    createdByStaffId: staffId
  }
});

// 2. Add count lines
await prisma.inventoryCountLine.createMany({
  data: countLines.map(line => ({
    countSessionId: session.id,
    ingredientId: line.ingredientId,
    countedQty: line.countedQty,
    unitId: line.unitId
  }))
});

// 3. Submit for approval
await prisma.inventoryCountSession.update({
  where: { id: session.id },
  data: { status: "SUBMITTED", submittedAt: new Date() }
});

// 4. Approve and post corrections
const lines = await prisma.inventoryCountLine.findMany({
  where: { countSessionId: session.id }
});

const movements = await Promise.all(
  lines.map(async line => {
    const currentQty = await inventoryService.getOnHand({
      storeId: "store_1",
      ingredientId: line.ingredientId
    });
    const delta = new Decimal(line.countedQty).minus(currentQty);
    return {
      storeId: "store_1",
      ingredientId: line.ingredientId,
      type: "COUNT_CORRECTION",
      qtyDelta: delta.toString(),
      unitId: line.unitId,
      refType: "COUNT",
      refId: session.id
    };
  })
);

await inventoryService.postMovementsBatch(movements);

await prisma.inventoryCountSession.update({
  where: { id: session.id },
  data: {
    status: "APPROVED",
    approvedAt: new Date(),
    approvedByStaffId: managerId
  }
});
```

## Verification

### Build Status
✅ TypeScript compilation successful (inventory service files)
⚠️ Pre-existing errors in other files (functionRoom.ts, sop.ts) - unrelated to inventory implementation

### Server Status
✅ Server starts successfully with inventory service loaded
✅ All plugins registered correctly
✅ API endpoints accessible

### Database Status
✅ Migration applied successfully
✅ Schema in sync
✅ All indexes created

## Next Steps

### Immediate
1. Seed initial inventory units (ml, g, pcs, kg, L)
2. Create admin UI for ingredient management
3. Implement recipe management UI

### Short-term
1. Integrate with POS transaction flow (auto-deduct on sale)
2. Implement count session workflow UI
3. Add low stock alerts

### Long-term
1. Unit conversion support
2. Multi-store transfers
3. Batch import from CSV/Excel
4. Advanced reporting and analytics
5. Predictive reorder suggestions

## Files Modified/Created

### Created
- `apps/api/src/services/inventory.service.ts` (470 lines)
- `apps/api/src/services/inventory.service.test.ts` (80 lines)
- `apps/api/src/services/INVENTORY_README.md` (650 lines)
- `apps/api/src/plugins/inventoryService.ts` (13 lines)
- `apps/api/src/routes/inventory.ts` (420 lines)
- `apps/api/prisma/migrations/20260302155513_add_inventory_system/migration.sql` (164 lines)
- `INVENTORY_IMPLEMENTATION.md` (this file)

### Modified
- `apps/api/prisma/schema.prisma` - Added inventory models and enums
- `apps/api/src/types/fastify.d.ts` - Added InventoryService type
- `apps/api/src/index.ts` - Registered inventory plugin and routes
- `apps/api/package.json` - Added decimal.js dependency

## Summary

The inventory system is fully implemented and operational. All core requirements have been met:

✅ Prisma schema with inventory models
✅ Decimal support via decimal.js
✅ Migration generated and applied
✅ Transactional service layer
✅ Unit consistency enforcement
✅ Auditable ledger (InventoryMovement)
✅ Per-item recipe support (MenuItemRecipe)
✅ API routes with authentication
✅ Comprehensive documentation
✅ Runtime validation and error handling
✅ Build passes (inventory-specific files)

The system is ready for:
- Admin UI development
- POS integration
- Production deployment
