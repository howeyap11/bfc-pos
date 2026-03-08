# Runtime & Troubleshooting Guide

This document consolidates common runtime issues, dev diagnostics, and known Fastify/Next.js integration pitfalls for the **local-first POS + QR Ordering** system.

Scope:
- Next.js ↔ Fastify proxy troubleshooting
- Port mismatches and HTML/JSON failure modes
- Staff guard patterns (Fastify preHandler)
- Fastify decoration/scoping pitfalls (preHandler undefined)
- Temporary debug endpoints and safe usage

Non-scope:
- Product behavior specs (see `/docs/pos/pos-register-spec.md`)
- UI behavior specs (see `/docs/ui/*`)

---

## Quick Health Checklist

### 1) Verify Fastify is running
```bash
curl http://127.0.0.1:3000/health
# Expected: {"ok":true,"service":"api","ts":"..."}
```

### 2) Verify Next.js proxy health
```bash
curl http://localhost:3000/api/health
# Expected: {"web":"ok","backend":"ok","backendResponse":{...}}
```

### 3) Check database statistics
```bash
curl http://127.0.0.1:3000/debug/menu-count
# Expected: {"itemsTotal":4,"itemsActive":4,"categoriesTotal":3,...}
```

---

## Common Issues

### Issue 1: "Proxy failed" - Port Mismatch

**Error:**
```json
{"error":"Proxy failed","message":"fetch failed"}
```

**Cause:** Next.js proxy trying to reach Fastify on wrong port.

**Fix:**
1. Check Fastify port: `apps/api/src/index.ts` → `app.listen({ port: 3000 })`
2. Update `apps/web/.env.local`: `POS_API_BASE_URL=http://127.0.0.1:3000`
3. Restart Next.js dev server (env vars loaded at startup)

**Note:** Fastify runs on port **3000** by default, not 3001.

---

### Issue 2: "preHandler hook should be a function, instead got undefined"

**Error:**
```
FastifyError: preHandler hook should be a function, instead got undefined
```

**Location:** Route files using `app.addHook("preHandler", app.requireStaff)`

**Cause:** Fastify plugin scoping - `app.requireStaff` decoration not available in scoped plugin context.

**Fix:** Import hook function directly instead of using decoration:

```typescript
// ❌ Wrong (decoration might be undefined)
export async function myRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireStaff);
}

// ✅ Correct (import function directly)
import { requireStaffHook } from "../plugins/staffGuard";

export async function myRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaffHook);
}
```

**Files Fixed:**
- `apps/api/src/routes/register.ts`
- `apps/api/src/routes/drawer.ts`
- `apps/api/src/routes/sop.ts`
- `apps/api/src/routes/posSales.ts`

---

### Issue 3: Menu Returns HTML Instead of JSON

**Error:**
```
Invalid JSON from /api/menu. First 120 chars: <!DOCTYPE html...
```

**Cause:** Frontend fetching a Next.js page route instead of API route.

**Fix:**
1. Ensure frontend fetches from `/api/*` routes only
2. Verify Next.js API route exists: `apps/web/src/app/api/menu/route.ts`
3. Verify route uses `proxyToBackend()` helper
4. Check backend URL in error message matches Fastify port

**Example:**
```typescript
// ✅ Correct
const data = await fetchJson("/api/menu");

// ❌ Wrong (fetches Next.js page)
const data = await fetchJson("/menu");
```

---

### Issue 4: "app.requireStaff is not a function"

**Error:**
```
TypeError: app.requireStaff is not a function
```

**Cause:** Same as Issue 2 - decoration timing/scoping issue.

**Fix:** Use direct import pattern (see Issue 2).

---

## Debug Endpoints

### GET /debug/menu-count

Returns database and menu statistics.

**Response:**
```json
{
  "databaseUrl": "file:./prisma/dev.db",
  "cwd": "/path/to/apps/api",
  "itemsTotal": 4,
  "itemsActive": 4,
  "itemsStore1": 4,
  "categoriesTotal": 3,
  "subcategoriesTotal": 0
}
```

**Usage:** Diagnose database connection and seed status.

### GET /debug/whoami

Verifies staff authentication.

**Response (authenticated):**
```json
{
  "authenticated": true,
  "staff": {"authenticated": true},
  "headers": {"x-staff-key": "***"}
}
```

**Response (unauthenticated):**
```json
{
  "error": "UNAUTHORIZED"
}
```

---

## Environment Variables

### apps/web/.env.local

```bash
# Public API base (client-side)
NEXT_PUBLIC_API_BASE_URL=http://192.168.0.173:3000

# Staff key
STAFF_KEY=super-long-random-string

# Backend API base (server-side proxies)
# IMPORTANT: Fastify runs on port 3000
POS_API_BASE_URL=http://127.0.0.1:3000
```

### apps/api/.env

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# Staff key (must match Next.js)
STAFF_KEY=super-long-random-string
```

---

## Staff Guard Pattern

### Correct Pattern (Import Hook Directly)

```typescript
import { requireStaffHook } from "../plugins/staffGuard";

export async function myRoutes(app: FastifyInstance) {
  // File-level hook (applies to all routes)
  app.addHook("preHandler", requireStaffHook);
  
  app.get("/route1", handler1);
  app.post("/route2", handler2);
}
```

### Alternative Pattern (Per-Route)

```typescript
export async function myRoutes(app: FastifyInstance) {
  // Per-route hook (more explicit)
  app.get("/route1", { preHandler: app.requireStaff }, handler1);
  app.post("/route2", { preHandler: app.requireStaff }, handler2);
}
```

**Note:** Both patterns work, but file-level `addHook` requires direct import.

---

## Proxy Helper Pattern

### Server-Side (Next.js API Routes)

```typescript
import { proxyToBackend } from "@/lib/api-helpers";

export async function GET() {
  return proxyToBackend("/menu");
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyToBackend("/pos/sales", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-staff-key": request.headers.get("x-staff-key") || "",
    },
    body: JSON.stringify(body),
  });
}
```

### Client-Side (React Components)

```typescript
// Safe JSON fetch with HTML detection
async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  
  if (!res.ok) {
    throw new Error(`[${res.status}] ${res.statusText}: ${text.slice(0, 200)}`);
  }
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}. First 120 chars: ${text.slice(0, 120)}`);
  }
}

// Usage
const data = await fetchJson("/api/menu");
```

---

## RegisterSession Enforcement (Currently Disabled)

**Current Rule:** Transactions do NOT require an open RegisterSession.

**Reason:** Staff login (cashier PIN) is sufficient for auditing. RegisterSession enforcement will be enabled when cash reconciliation module is implemented.

**Backend:** `apps/api/src/routes/posTransactions.ts` has the enforcement check commented out with TODO marker.

**Documentation:** See `docs/pos/pos-register-spec.md` section "RegisterSession (Currently Optional)"

---

## Transaction Success State Rendering

### Issue: Render Crash After Payment

**Symptoms:**
- Transaction created in DB
- No error toast
- Cart not cleared
- Success panel not shown
- React crash during render

**Cause:** Unsafe property access in `TransactionSuccessPanel` component.

**Fix:** Added null guards and safe access patterns.

### Layout (UTAK Style)

**Print Buttons Placement:**
- Print buttons (Receipt, Sticker) are positioned ABOVE the items list
- Displayed as 1x2 grid (left: Receipt, right: Sticker)
- Removed Kitchen and Order buttons for simplicity
- This prevents accidental clicks on "New Transaction" button
- Matches UTAK reference design

**Item Rendering (Shared Formatter):**

Both cart items and success screen items use `formatLineItemModifiers()` helper:

1. **Primary modifiers (bold white):**
   - Size (16oz, 22oz)
   - Temperature (ICED, HOT)
   - Format: "16oz ICED"

2. **Milk substitution (gray):**
   - ONLY shown if different from item's default milk
   - Format: "sub oatmilk", "sub almond", "sub soy"
   - NOT shown if using default (e.g., full cream)

3. **Shots (conditional bold):**
   - Always shown for items that support shots
   - Bold if changed from default for that size
   - Regular gray if matches default
   - Examples:
     - Default 16oz espresso = 2 shots → "2 shots" (gray)
     - Changed to 3 → "**3 shots**" (bold white)

4. **Other modifiers (gray):**
   - Syrups, extras, etc.
   - Comma-separated

5. **Display order:**
   - Primary: "16oz ICED"
   - Secondary: "sub oatmilk, **3 shots**, Vanilla Syrup, Extra Foam"

**Fulfillment Badge:**
- Color-coded: FOR_HERE (green), TAKE_OUT (amber), FOODPANDA (pink)
- Displayed next to item name

**Note:**
- Yellow italic if present

**Code Example:**

```typescript
// Guard in conditional render
if (cartPanelMode === "SUCCESS") {
  if (!lastCompletedTransaction) {
    console.error("[CART PANEL] SUCCESS mode but no transaction data");
    return <ErrorFallback />;
  }
  return <TransactionSuccessPanel transaction={lastCompletedTransaction} />;
}

// Guard inside TransactionSuccessPanel
function TransactionSuccessPanel({ transaction, ... }) {
  if (!transaction || !transaction.id || !transaction.items) {
    console.error("[SUCCESS PANEL] Missing required fields");
    return null;
  }
  
  // Safe array access
  const hasDrinks = transaction.items.some(item => 
    item?.itemName?.toLowerCase().includes("coffee")
  );
  
  // Safe map with null check
  {(transaction.items || []).map((item, idx) => {
    if (!item) return null;
    return <div>{item.qty || 1}× {item.itemName || "Unknown"}</div>;
  })}
}
```

**Debug Logging:**
- `[RENDER]` - Component-level state on every render
- `[CART PANEL RENDER]` - Cart panel conditional logic
- `[SUCCESS PANEL RENDER]` - Success panel entry with transaction data
- `[PAY] START` through `[PAY] State updated` - Payment flow tracking

---

## Payment Authorization Issues

### Issue: UNAUTHORIZED Error on Payment Recording

**Symptoms:**
- `POST /pos/transactions` succeeds (transaction created)
- `POST /pos/transactions/:id/payments` returns 401 UNAUTHORIZED
- Cart not cleared, success panel not shown

**Cause:** Staff key not being sent or mismatched between frontend and backend.

**Architecture:**
- Client calls Next.js API route: `/api/pos/transactions/:id/payments`
- Client sends `x-staff-key: activeStaff.key` in request headers
- Next.js API route proxies to Fastify: `http://127.0.0.1:3000/pos/transactions/:id/payments`
- Next.js API route passes through `x-staff-key` header from client request
- Fastify validates header against `Staff` table in `requireStaffHook`

**Debug Steps:**

1. **Check staff has a key:**
   ```bash
   # Run in apps/api directory
   npx prisma studio
   # Open Staff table, verify each staff has a unique key field
   ```

2. **Check console logs:**
   - `[API Route] POST /api/pos/transactions/:id/payments` - Shows if Next.js route is called
   - `[StaffGuard]` - Shows if backend receives header and validates it
   - `[PAY] PAYMENT RESPONSE` - Shows response status and error

3. **Verify staff is logged in:**
   - Check `[PAY] STAFF OBJECT` log shows `{ id, name, role, key }`
   - If `key` is missing or undefined, staff needs to log in again to get the key from DB

4. **Check Fastify is using staff guard:**
   ```typescript
   // apps/api/src/routes/posTransactions.ts
   export async function posTransactionsRoutes(app: FastifyInstance) {
     app.addHook("preHandler", requireStaffHook); // ✅ Required
   }
   ```

**Console Output (Success):**
```
[PAY] START { method: "CASH", cartLength: 3, activeStaff: {...}, staffKey: "staff_9ev8..." }
[PAY] Creating transaction... { itemCount: 3 }
[PAY] TX BODY { itemCount: 3, discountCents: 0, firstItem: {...} }
[API Route] POST /api/pos/transactions { hasStaffKey: true, staffKeyLength: 29 }
[StaffGuard] { method: "POST", url: "/pos/transactions", hasIncoming: true, ... }
[StaffGuard] Authorized { staffId: "...", staffName: "Andrea", staffRole: "ADMIN" }
[PAY] TX SUCCESS { id: "...", totalCents: 15000 }
[PAY] Recording payment... { transactionId: "...", totalCents: 15000, method: "CASH" }
[PAY] PAYMENT BODY { method: "CASH", amountCents: 15000 }
[API Route] POST /api/pos/transactions/:id/payments { hasStaffKey: true, staffKeyLength: 29 }
[StaffGuard] Authorized
[PAY] PAYMENT SUCCESS
[PAY] SUCCESS — switching state
```

**Console Output (Failure - Missing Staff Key):**
```
[PAY] START { method: "CASH", cartLength: 3, activeStaff: {...}, staffKey: "MISSING" }
[PAY] STAFF HAS NO KEY - Must log out and log back in
```

**Console Output (Failure - Invalid Key):**
```
[PAY] START { method: "CASH", cartLength: 3, activeStaff: {...}, staffKey: "staff_abc..." }
[PAY] Creating transaction... { itemCount: 3 }
[PAY] TX BODY { itemCount: 3, discountCents: 0, firstItem: {...} }
[API Route] POST /api/pos/transactions { hasStaffKey: true, staffKeyLength: 29 }
[StaffGuard] { method: "POST", url: "/pos/transactions", hasIncoming: true }
[StaffGuard] UNAUTHORIZED - Invalid key { keyPreview: "staff_abc..." }
[API Route] Backend error { status: 401, body: '{"error":"UNAUTHORIZED",...}' }
[API] FAILED { path: "/api/pos/transactions", status: 401, rawPreview: "...", data: {...} }
```

**Fix:**
1. Ensure staff has logged in and `activeStaff.key` is populated
2. Staff must log out and log back in after the key field was added to the database
3. Verify staff keys exist in database (use Prisma Studio)

**Authentication Flow (DB-based):**
1. Frontend loads staff list from `GET /staff` → returns `[{ id, name, role, passcode, key }]`
2. User selects staff and enters passcode → frontend validates locally
3. On success, frontend maps `key` → `staffKey` and stores `{ id, name, role, staffKey }` in:
   - `localStorage.setItem("bfc_active_staff", ...)`
   - `setActiveStaff({ id, name, role, staffKey })`
4. All protected API calls include header: `"x-staff-key": activeStaff.staffKey`
5. Next.js API routes pass through the header to Fastify backend
6. Fastify validates `staffKey` against `Staff.key` in database via `requireStaffHook`

**localStorage Migration:**
On app load, `checkActiveStaff()`:
- Reads `bfc_active_staff` from localStorage
- If it has `key` but not `staffKey`, migrates: `staffKey = key; delete key;`
- If it has neither `key` nor `staffKey`, clears localStorage and forces re-login
- This ensures old cached staff data is automatically upgraded or cleared

**Critical Bug Fix:**
The `DEFAULT_STAFF` fallback in `/api/staff/route.ts` was missing the `key` field. When the backend was unavailable, the fallback staff list had no keys, causing all payments to fail with "STAFF HAS NO KEY". The fallback now includes the actual staff keys from the database.

**Field Naming:**
- Database field: `Staff.key` (String, unique)
- Frontend state: `activeStaff.staffKey` (mapped from `key` for clarity)
- HTTP header: `x-staff-key` (sent in all protected requests)

**Common Mistakes:**
- ❌ Using old localStorage data without `staffKey` field → Auto-cleared on load
- ❌ Forgetting to add `x-staff-key` header in client fetch calls
- ❌ Using `process.env.STAFF_KEY` instead of passing through client header
- ❌ Using `activeStaff.key` instead of `activeStaff.staffKey` in frontend code

**Verification:**
```bash
# Check staff keys exist in database
cd apps/api
npx prisma studio
# Open Staff table, verify each staff has a unique key
```

**apiFetch Helper:**

To prevent silent failures, use the `apiFetch` helper from `@/lib/apiFetch`:

```typescript
import { apiFetch } from "@/lib/apiFetch";

const { res, data } = await apiFetch("/api/pos/transactions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-staff-key": activeStaff.key,
  },
  body: JSON.stringify({ items }),
});

if (!res.ok) {
  // Error already logged by apiFetch with full details
  setError(`Transaction failed (${res.status})`);
  return;
}

// Use data directly (already parsed)
console.log("Success:", data);
```

**Benefits:**
- Automatically logs status, raw response, and parsed data on failures
- Shows content-type to detect HTML vs JSON responses
- Prevents empty `{}` error logs
- Centralizes error logging logic