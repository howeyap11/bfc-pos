# Cloud Admin UI

Next.js admin dashboard for the Cloud Catalog API (items, ingredients, recipes).

## Prerequisites

- Node.js 18+
- Cloud API running (see `apps/cloud-api`)

## Setup

1. Copy `.env.local.example` to `.env.local` and set the API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

## Run

```bash
# Development (port 3002)
pnpm dev

# Production (build then start)
pnpm build
pnpm start
```

- **cloud-api** runs on port **4000**.
- **cloud-ui** runs on port **3002**.
- Default admin login: **admin@bfc.local** / **admin123** (create the user first with `pnpm create-admin` in `apps/cloud-api`).
