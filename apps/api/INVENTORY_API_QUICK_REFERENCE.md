# Inventory API Quick Reference

All endpoints require `x-staff-key` header for authentication.

## Base URL
`http://localhost:3000`

## Movement Operations

### Create Movement
```http
POST /inventory/movements
Content-Type: application/json
x-staff-key: <staff-key>

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

**Movement Types:**
- `PURCHASE` - Receiving inventory
- `CONSUMPTION` - Used in production/sales
- `WASTAGE` - Spoilage, damage, theft
- `ADJUSTMENT` - Manual corrections
- `COUNT_CORRECTION` - Physical count adjustments
- `TRANSFER_IN` - Received from another location
- `TRANSFER_OUT` - Sent to another location

### Batch Create Movements
```http
POST /inventory/movements/batch
Content-Type: application/json
x-staff-key: <staff-key>

{
  "movements": [
    {
      "storeId": "store_1",
      "ingredientId": "ing_123",
      "type": "COUNT_CORRECTION",
      "qtyDelta": "5.5",
      "unitId": "unit_ml"
    },
    {
      "storeId": "store_1",
      "ingredientId": "ing_456",
      "type": "COUNT_CORRECTION",
      "qtyDelta": "-2.25",
      "unitId": "unit_g"
    }
  ]
}
```

### List Movements
```http
GET /inventory/movements?storeId=store_1&ingredientId=ing_123&limit=50&offset=0
x-staff-key: <staff-key>
```

**Query Parameters:**
- `storeId` (default: "store_1")
- `ingredientId` (optional)
- `dateFrom` (optional, ISO date)
- `dateTo` (optional, ISO date)
- `refType` (optional)
- `refId` (optional)
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

## Stock Operations

### Get Stock for One Ingredient
```http
GET /inventory/stock/ing_123?storeId=store_1
x-staff-key: <staff-key>
```

**Response:**
```json
{
  "success": true,
  "ingredientId": "ing_123",
  "onHandQty": "100.5"
}
```

### Get Stock Levels (Multiple Ingredients)
```http
GET /inventory/stock-levels?storeId=store_1&ingredientIds=ing_123,ing_456
x-staff-key: <staff-key>
```

**Response:**
```json
{
  "success": true,
  "stockLevels": [
    {
      "ingredientId": "ing_123",
      "ingredientName": "Espresso Beans",
      "sku": "SKU123",
      "onHandQty": "4500",
      "reorderLevel": "1000",
      "unit": {
        "id": "unit_g",
        "code": "g",
        "name": "Grams"
      },
      "isActive": true,
      "isLowStock": false,
      "updatedAt": "2026-03-02T16:00:00.000Z"
    }
  ]
}
```

### Recalculate Stock (Admin Repair)
```http
POST /inventory/recalc-stock
Content-Type: application/json
x-staff-key: <staff-key>

{
  "storeId": "store_1",
  "ingredientId": "ing_123"
}
```

**Response:**
```json
{
  "success": true,
  "ingredientId": "ing_123",
  "recalculatedQty": "4500",
  "movementsProcessed": 42,
  "stock": { ... }
}
```

## Ingredient Management

### List Ingredients
```http
GET /inventory/ingredients?storeId=store_1&isActive=true
x-staff-key: <staff-key>
```

### Create Ingredient
```http
POST /inventory/ingredients
Content-Type: application/json
x-staff-key: <staff-key>

{
  "storeId": "store_1",
  "sku": "SKU123",
  "name": "Espresso Beans",
  "unitId": "unit_g",
  "reorderLevel": "1000",
  "isActive": true
}
```

### Update Ingredient
```http
PATCH /inventory/ingredients/ing_123
Content-Type: application/json
x-staff-key: <staff-key>

{
  "name": "Premium Espresso Beans",
  "reorderLevel": "1500",
  "isActive": true
}
```

## Unit Management

### List Units
```http
GET /inventory/units?storeId=store_1
x-staff-key: <staff-key>
```

**Response:**
```json
{
  "success": true,
  "units": [
    {
      "id": "unit_ml",
      "storeId": "store_1",
      "code": "ml",
      "name": "Milliliters",
      "createdAt": "2026-03-02T16:00:00.000Z",
      "updatedAt": "2026-03-02T16:00:00.000Z"
    }
  ]
}
```

### Create Unit
```http
POST /inventory/units
Content-Type: application/json
x-staff-key: <staff-key>

{
  "storeId": "store_1",
  "code": "ml",
  "name": "Milliliters"
}
```

## Common Units

Standard units to create:
- `ml` - Milliliters
- `L` - Liters
- `g` - Grams
- `kg` - Kilograms
- `pcs` - Pieces
- `oz` - Ounces
- `lb` - Pounds

## Error Responses

### Unit Mismatch
```json
{
  "success": false,
  "error": "Unit mismatch: Movement unit ml does not match ingredient unit g. Unit conversion not yet supported."
}
```

### Invalid Quantity
```json
{
  "success": false,
  "error": "Invalid qtyDelta: abc. Must be a valid number."
}
```

### NaN Detection
```json
{
  "success": false,
  "error": "Invalid qtyDelta: NaN. Cannot be NaN."
}
```

### Ingredient Not Found
```json
{
  "success": false,
  "error": "Ingredient not found: ing_123"
}
```

## Usage Examples

### Example 1: Receive Inventory
```bash
curl -X POST http://localhost:3000/inventory/movements \
  -H "Content-Type: application/json" \
  -H "x-staff-key: your-staff-key" \
  -d '{
    "storeId": "store_1",
    "ingredientId": "ing_coffee_beans",
    "type": "PURCHASE",
    "qtyDelta": "5000",
    "unitId": "unit_g",
    "refType": "PO",
    "refId": "po_2026_001",
    "notes": "Weekly delivery from supplier"
  }'
```

### Example 2: Record Sales Consumption
```bash
curl -X POST http://localhost:3000/inventory/movements \
  -H "Content-Type: application/json" \
  -H "x-staff-key: your-staff-key" \
  -d '{
    "storeId": "store_1",
    "ingredientId": "ing_coffee_beans",
    "type": "CONSUMPTION",
    "qtyDelta": "-36",
    "unitId": "unit_g",
    "refType": "SALE",
    "refId": "txn_123",
    "notes": "2x Latte"
  }'
```

### Example 3: Physical Count Correction
```bash
# First, get current stock
curl -X GET "http://localhost:3000/inventory/stock/ing_coffee_beans?storeId=store_1" \
  -H "x-staff-key: your-staff-key"

# Then post correction (assuming counted 4500g, system shows 4800g)
curl -X POST http://localhost:3000/inventory/movements \
  -H "Content-Type: application/json" \
  -H "x-staff-key: your-staff-key" \
  -d '{
    "storeId": "store_1",
    "ingredientId": "ing_coffee_beans",
    "type": "COUNT_CORRECTION",
    "qtyDelta": "-300",
    "unitId": "unit_g",
    "refType": "COUNT",
    "refId": "count_session_456",
    "notes": "End of shift count"
  }'
```

### Example 4: Get Low Stock Items
```bash
curl -X GET "http://localhost:3000/inventory/stock-levels?storeId=store_1" \
  -H "x-staff-key: your-staff-key" \
  | jq '.stockLevels[] | select(.isLowStock == true)'
```

### Example 5: View Movement History
```bash
# Last 30 days for specific ingredient
curl -X GET "http://localhost:3000/inventory/movements?storeId=store_1&ingredientId=ing_coffee_beans&dateFrom=2026-02-01&dateTo=2026-03-01&limit=100" \
  -H "x-staff-key: your-staff-key"
```

## Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Test Authentication
```bash
curl http://localhost:3000/debug/whoami \
  -H "x-staff-key: your-staff-key"
```

## Notes

- All decimal quantities are stored as strings to preserve precision
- Negative `qtyDelta` reduces stock, positive increases it
- All operations are transactional (movement + stock update are atomic)
- Unit consistency is enforced (no automatic conversion yet)
- All timestamps are in ISO 8601 format
