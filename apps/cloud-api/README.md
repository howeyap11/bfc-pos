# Cloud Catalog API

Catalog-only API for BFC QR Ordering. Manages menu items, ingredients, and recipes with sync support.

## Prerequisites

- Node.js 18+
- PostgreSQL

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Run migrations:
   ```bash
   pnpm db:migrate
   ```
3. Create an admin user (run once, idempotent):
   ```bash
   pnpm create-admin
   ```
   Default credentials: **admin@bfc.local** / **admin123**.

## Run

```bash
# Development (with hot reload)
pnpm dev

# Production (build first)
pnpm build
pnpm start
```

Server listens on `PORT` (default **4000**).

## API

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/health` | GET | - | Health check |
| `/auth/login` | POST | - | Login (email, password) → JWT |
| `/sync/catalog` | GET | - | Sync catalog `?sinceVersion=N` |
| `/admin/items` | GET | JWT | List menu items |
| `/admin/items` | POST | JWT | Create menu item |
| `/admin/items/:id` | GET/PATCH/DELETE | JWT | Menu item CRUD |
| `/admin/items/:id/recipe` | GET/PUT | JWT | Get or replace recipe lines |
| `/admin/ingredients` | GET | JWT | List ingredients |
| `/admin/ingredients` | POST | JWT | Create ingredient |
| `/admin/ingredients/:id` | GET/PATCH/DELETE | JWT | Ingredient CRUD |

Admin routes require `Authorization: Bearer <token>`.
