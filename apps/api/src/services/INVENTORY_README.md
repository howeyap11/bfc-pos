# Inventory Service

Local-first inventory management with auditable ledger for BFC QR Ordering system.

## Overview

The inventory service provides transactional inventory tracking with:
- **Auditable ledger**: All stock changes are recorded as movements
- **Decimal precision**: Uses `decimal.js` to avoid floating-point errors
- **Unit consistency**: Enforces that movements match ingredient units
- **Transactional updates**: Stock and movements are updated atomically

## Architecture

### Models

#### InventoryUnit
Defines measurement units (ml, g, pcs, kg, L).

```typescript
{
  id: string
  storeId: string
  code: string      // "ml", "g", "pcs"
  name: string      // "Milliliters", "Grams", "Pieces"
}
```

#### Ingredient
Represents an inventory item.

```typescript
{
  id: string
  storeId: string
  sku?: string
  name: string
  unitId: string
  reorderLevel?: string  // Stored as string for decimal support
  isActive: boolean
}
```

#### IngredientStock
Current on-hand quantity for each ingredient.

```typescript
{
  id: string
  storeId: string
  ingredientId: string (unique)
  onHandQty: string     // Stored as string for decimal support
  updatedAt: DateTime
}
```

#### InventoryMovement (Ledger)
Immutable record of all stock changes.

```typescript
{
  id: string
  storeId: string
  ingredientId: string
  type: InventoryMovementType
  qtyDelta: string      // Signed decimal (negative reduces stock)
  unitId: string
  refType?: string      // "SALE", "WASTAGE_REPORT", "COUNT", "MANUAL"
  refId?: string        // transactionId, wastageId, countSessionId
  notes?: string
  createdByStaffId?: string
  createdAt: DateTime
}
```

**Movement Types:**
- `PURCHASE`: Receiving inventory from suppliers
- `CONSUMPTION`: Used in production/sales
- `WASTAGE`: Spoilage, damage, theft
- `ADJUSTMENT`: Manual corrections
- `COUNT_CORRECTION`: Physical count adjustments
- `TRANSFER_IN`: Received from another location
- `TRANSFER_OUT`: Sent to another location

#### MenuItemRecipe
Links menu items to ingredients with consumption rates.

```typescript
{
  id: string
  storeId: string
  menuItemId: string
  ingredientId: string
  qtyPerItem: string    // Decimal quantity consumed per menu item
  unitId: string
}
```

#### InventoryCountSession
Physical inventory count sessions.

```typescript
{
  id: string
  storeId: string
  type: InventoryCountType    // BEGIN_SHIFT, END_SHIFT, SPOT
  status: InventoryCountStatus // DRAFT, SUBMITTED, APPROVED
  startedAt: DateTime
  submittedAt?: DateTime
  approvedAt?: DateTime
  createdByStaffId?: string
  approvedByStaffId?: string
}
```

## Service API

### postMovement(params)

Post a single inventory movement and update stock transactionally.

```typescript
await inventoryService.postMovement({
  storeId: "store_1",
  ingredientId: "ing_123",
  type: "PURCHASE",
  qtyDelta: "100.5",      // Can be string, number, or Decimal
  unitId: "unit_ml",
  refType: "PO",
  refId: "po_456",
  notes: "Weekly delivery",
  createdByStaffId: "staff_789"
});
```

**Validation:**
- Rejects NaN and invalid numbers
- Enforces unit consistency (movement.unitId must equal ingredient.unitId)
- Validates ingredient exists and belongs to store

**Returns:**
```typescript
{
  movement: InventoryMovement,
  stock: IngredientStock
}
```

### getOnHand(params)

Get current on-hand quantity for an ingredient.

```typescript
const qty: Decimal = await inventoryService.getOnHand({
  storeId: "store_1",
  ingredientId: "ing_123"
});

console.log(qty.toString()); // "100.5"
```

**Returns:** `Decimal` (or `Decimal(0)` if no stock record exists)

### listMovements(params)

List inventory movements with optional filters.

```typescript
const result = await inventoryService.listMovements({
  storeId: "store_1",
  ingredientId: "ing_123",      // Optional
  dateFrom: new Date("2026-01-01"),  // Optional
  dateTo: new Date("2026-03-01"),    // Optional
  refType: "SALE",              // Optional
  refId: "txn_456",             // Optional
  limit: 50,                    // Default: 100
  offset: 0                     // Default: 0
});
```

**Returns:**
```typescript
{
  movements: InventoryMovement[],
  total: number,
  limit: number,
  offset: number
}
```

### recalcStockFromLedger(params)

Recalculate stock from ledger (admin repair function).

```typescript
const result = await inventoryService.recalcStockFromLedger({
  storeId: "store_1",
  ingredientId: "ing_123"
});
```

**Returns:**
```typescript
{
  ingredientId: string,
  recalculatedQty: string,
  movementsProcessed: number,
  stock: IngredientStock
}
```

### postMovementsBatch(movements)

Post multiple movements in a single transaction.

```typescript
await inventoryService.postMovementsBatch([
  {
    storeId: "store_1",
    ingredientId: "ing_123",
    type: "COUNT_CORRECTION",
    qtyDelta: "5.5",
    unitId: "unit_ml"
  },
  {
    storeId: "store_1",
    ingredientId: "ing_456",
    type: "COUNT_CORRECTION",
    qtyDelta: "-2.25",
    unitId: "unit_g"
  }
]);
```

### getStockLevels(params)

Get stock levels for multiple ingredients with low stock indicators.

```typescript
const levels = await inventoryService.getStockLevels({
  storeId: "store_1",
  ingredientIds: ["ing_123", "ing_456"]  // Optional
});
```

**Returns:**
```typescript
[
  {
    ingredientId: string,
    ingredientName: string,
    sku?: string,
    onHandQty: string,
    reorderLevel?: string,
    unit: { id, code, name },
    isActive: boolean,
    isLowStock: boolean,
    updatedAt: DateTime
  }
]
```

## API Endpoints

All endpoints require staff authentication (`x-staff-key` header).

### POST /inventory/movements
Create a new inventory movement.

**Request:**
```json
{
  "storeId": "store_1",
  "ingredientId": "ing_123",
  "type": "PURCHASE",
  "qtyDelta": "100.5",
  "unitId": "unit_ml",
  "refType": "PO",
  "refId": "po_456",
  "notes": "Weekly delivery",
  "createdByStaffId": "staff_789"
}
```

### POST /inventory/movements/batch
Create multiple movements in one transaction.

**Request:**
```json
{
  "movements": [
    {
      "storeId": "store_1",
      "ingredientId": "ing_123",
      "type": "COUNT_CORRECTION",
      "qtyDelta": "5.5",
      "unitId": "unit_ml"
    }
  ]
}
```

### GET /inventory/movements
List movements with filters.

**Query params:**
- `storeId` (default: "store_1")
- `ingredientId` (optional)
- `dateFrom` (optional, ISO date)
- `dateTo` (optional, ISO date)
- `refType` (optional)
- `refId` (optional)
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

### GET /inventory/stock/:ingredientId
Get on-hand quantity for an ingredient.

**Query params:**
- `storeId` (default: "store_1")

### GET /inventory/stock-levels
Get stock levels for multiple ingredients.

**Query params:**
- `storeId` (default: "store_1")
- `ingredientIds` (optional, comma-separated)

### POST /inventory/recalc-stock
Recalculate stock from ledger (admin repair).

**Request:**
```json
{
  "storeId": "store_1",
  "ingredientId": "ing_123"
}
```

### Ingredient Management

#### GET /inventory/ingredients
List all ingredients.

**Query params:**
- `storeId` (default: "store_1")
- `isActive` (optional, "true" or "false")

#### POST /inventory/ingredients
Create a new ingredient.

**Request:**
```json
{
  "storeId": "store_1",
  "sku": "SKU123",
  "name": "Espresso Beans",
  "unitId": "unit_g",
  "reorderLevel": "1000",
  "isActive": true
}
```

#### PATCH /inventory/ingredients/:id
Update an ingredient.

**Request:**
```json
{
  "name": "Premium Espresso Beans",
  "reorderLevel": "1500"
}
```

### Unit Management

#### GET /inventory/units
List all inventory units.

#### POST /inventory/units
Create a new inventory unit.

**Request:**
```json
{
  "storeId": "store_1",
  "code": "ml",
  "name": "Milliliters"
}
```

## Usage Examples

### Example 1: Receiving Inventory

```typescript
// Receive 5kg of coffee beans
await inventoryService.postMovement({
  storeId: "store_1",
  ingredientId: "ing_coffee_beans",
  type: "PURCHASE",
  qtyDelta: "5000",  // 5000 grams
  unitId: "unit_g",
  refType: "PO",
  refId: "po_2026_001",
  notes: "Weekly delivery from supplier"
});
```

### Example 2: Recording Sales Consumption

```typescript
// Customer ordered 2 lattes, each uses 18g of coffee
await inventoryService.postMovement({
  storeId: "store_1",
  ingredientId: "ing_coffee_beans",
  type: "CONSUMPTION",
  qtyDelta: "-36",  // Negative reduces stock
  unitId: "unit_g",
  refType: "SALE",
  refId: "txn_123",
  notes: "2x Latte"
});
```

### Example 3: Physical Count Correction

```typescript
// Physical count shows 4500g, system shows 4800g
const currentQty = await inventoryService.getOnHand({
  storeId: "store_1",
  ingredientId: "ing_coffee_beans"
});

const countedQty = new Decimal("4500");
const delta = countedQty.minus(currentQty);

await inventoryService.postMovement({
  storeId: "store_1",
  ingredientId: "ing_coffee_beans",
  type: "COUNT_CORRECTION",
  qtyDelta: delta.toString(),  // "-300"
  unitId: "unit_g",
  refType: "COUNT",
  refId: "count_session_456",
  notes: "End of shift count"
});
```

### Example 4: Batch Count Session

```typescript
const countLines = [
  { ingredientId: "ing_coffee", countedQty: "4500", unitId: "unit_g" },
  { ingredientId: "ing_milk", countedQty: "15000", unitId: "unit_ml" },
  { ingredientId: "ing_sugar", countedQty: "2000", unitId: "unit_g" }
];

// Get current stock for all ingredients
const movements = await Promise.all(
  countLines.map(async (line) => {
    const currentQty = await inventoryService.getOnHand({
      storeId: "store_1",
      ingredientId: line.ingredientId
    });
    
    const delta = new Decimal(line.countedQty).minus(currentQty);
    
    return {
      storeId: "store_1",
      ingredientId: line.ingredientId,
      type: "COUNT_CORRECTION" as const,
      qtyDelta: delta.toString(),
      unitId: line.unitId,
      refType: "COUNT",
      refId: "count_session_789"
    };
  })
);

// Post all corrections in one transaction
await inventoryService.postMovementsBatch(movements);
```

## Best Practices

### 1. Always Use Decimal for Calculations

```typescript
// ✅ Good
const a = new Decimal("100.5");
const b = new Decimal("50.25");
const sum = a.plus(b);

// ❌ Bad
const sum = 100.5 + 50.25;  // Floating-point errors!
```

### 2. Use Negative Deltas for Reductions

```typescript
// ✅ Good
qtyDelta: "-25.5"  // Reduces stock by 25.5

// ❌ Bad
qtyDelta: "25.5", type: "REDUCTION"  // No such type!
```

### 3. Always Link Movements to Source Records

```typescript
// ✅ Good
refType: "SALE",
refId: "txn_123"

// ❌ Bad
refType: null,
refId: null  // Can't trace back to source!
```

### 4. Use Batch Operations for Count Sessions

```typescript
// ✅ Good - All or nothing
await inventoryService.postMovementsBatch(movements);

// ❌ Bad - Partial failures possible
for (const movement of movements) {
  await inventoryService.postMovement(movement);
}
```

## Error Handling

The service throws descriptive errors for common issues:

```typescript
// Unit mismatch
throw new Error(
  "Unit mismatch: Movement unit ml does not match ingredient unit g. " +
  "Unit conversion not yet supported."
);

// Invalid quantity
throw new Error("Invalid qtyDelta: abc. Must be a valid number.");

// NaN detection
throw new Error("Invalid qtyDelta: NaN. Cannot be NaN.");

// Ingredient not found
throw new Error("Ingredient not found: ing_123");

// Store mismatch
throw new Error("Ingredient ing_123 does not belong to store store_2");
```

## Future Enhancements

### Unit Conversion
Currently, movements must use the same unit as the ingredient. Future versions will support automatic unit conversion (e.g., kg → g, L → ml).

### Recipe-Based Consumption
Automatically deduct ingredients when menu items are sold based on `MenuItemRecipe` definitions.

### Low Stock Alerts
Trigger notifications when `onHandQty <= reorderLevel`.

### Batch Import
Import historical movements from CSV/Excel for initial setup.

### Multi-Store Transfers
Track inventory transfers between stores with automatic TRANSFER_OUT and TRANSFER_IN movements.

## Testing

Run the test suite:

```bash
npx tsx src/services/inventory.service.test.ts
```

Expected output:
```
✅ Valid decimal: 100.5
✅ Correctly rejected NaN
✅ Correctly rejected invalid number
✅ 100.5 + 50.25 = 150.75
✅ 100.5 + -25.5 = 75
✅ All basic tests passed!
```

## Migration

The inventory system was added via migration `20260302155513_add_inventory_system`.

To apply:
```bash
npx prisma migrate dev
```

To reset and reapply:
```bash
npx prisma migrate reset
npx prisma migrate dev
```
