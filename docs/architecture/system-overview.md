# System Overview (Local-First POS + QR)

## Deployment Model
- Single machine deployment (local server + POS terminal).
- No cloud.
- SQLite database stored locally.

## Tech Stack
- Backend: Fastify + Prisma
- Frontend: Next.js (POS + QR web)
- DB: SQLite
- Future: Flutter module (staff app)

## Core Modules
1. POS Register (direct sales)
2. Transactions (history + audit-sensitive actions)
3. Staff Login (embedded, UTAK-style)
4. Store Config (enabled payment buttons per store)
5. QR Menu checkout (customer-facing)
6. QR Acceptance (cashier converts orders into sales)

## Store Model
- Single store: `store_1`

## Data Flow Summary
- Menu data loaded locally.
- Cart is client-side until checkout.
- Transaction + payments persisted through backend endpoints.
- QR orders are created first, then later accepted by cashier.

## Non-goals
- Multi-store syncing
- Cloud ordering
- Distributed offline sync