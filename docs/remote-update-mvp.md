# Remote POS Update – MVP

Allows the owner to trigger POS updates (and other commands) remotely from Cloud Admin without visiting the store.

## Architecture

- **Cloud Admin** creates devices and sends commands.
- **Local POS** polls the cloud for pending commands every 2 minutes.
- **Offline-first**: If cloud is unreachable, POS keeps working; polling is skipped.

---

## Data Model (Cloud API)

### Device

| Field       | Type     | Description                                          |
|------------|----------|------------------------------------------------------|
| id         | string   | CUID                                                 |
| storeId    | string   | Store identifier (default `store_1`)                 |
| name       | string   | Display name (e.g. "Café POS 1")                     |
| deviceKey  | string   | Secret for polling auth; copied to POS `.env`        |
| lastSeenAt | DateTime | Last heartbeat                                      |
| posVersion | string   | Version reported by POS                              |

### DeviceCommand

| Field        | Type   | Description                                  |
|-------------|--------|----------------------------------------------|
| id          | string | CUID                                         |
| deviceId    | string | FK to Device                                 |
| type        | enum   | `UPDATE_POS`, `RESTART_POS`, `FORCE_SYNC`    |
| status      | enum   | `PENDING`, `RUNNING`, `SUCCESS`, `FAILED`    |
| errorMessage| string | Optional error when status is `FAILED`       |
| startedAt   | DateTime | When execution began                        |
| completedAt | DateTime | When execution finished                     |

---

## Cloud API Endpoints

### Admin (JWT required)

| Method | Path                     | Description                |
|--------|--------------------------|----------------------------|
| GET    | /admin/devices           | List all devices           |
| POST   | /admin/devices           | Create device (returns `deviceKey` once) |
| GET    | /admin/devices/:id       | Get device with commands   |
| POST   | /admin/devices/:id/commands | Create command (body: `{ type }`) |
| DELETE | /admin/devices/:id       | Remove device              |

### Sync (X-Device-Key required)

| Method | Path                    | Description                         |
|--------|-------------------------|-------------------------------------|
| GET    | /sync/commands/pending  | Get PENDING commands for this device |
| POST   | /sync/commands/:id/status | Update status (body: `{ status, errorMessage? }`) |
| POST   | /sync/device/heartbeat  | Report lastSeenAt, posVersion       |

---

## Local POS Polling

- **Interval**: 2 minutes for commands, 5 minutes for heartbeat.
- **Condition**: Runs only when `CLOUD_URL` and `DEVICE_KEY` are set.
- **Flow**:
  1. GET /sync/commands/pending with `X-Device-Key`.
  2. For each command: POST RUNNING, execute, POST SUCCESS/FAILED.

---

## Local Command Runner

| Command      | Action                                                         |
|-------------|-----------------------------------------------------------------|
| FORCE_SYNC  | Run catalog sync + transaction flush immediately                |
| RESTART_POS | `process.exit(0)` after 3s (NSSM restarts service)             |
| UPDATE_POS  | Run `scripts/windows/update-pos.cmd` (or `UPDATE_SCRIPT` env)  |

The update script is customizable. Default: `pnpm install`, `pnpm run build`. Add `git pull` or `nssm restart` as needed.

---

## Cloud Admin UI

**Settings → Devices** (`/settings/devices`):

- List devices with status (Online/Offline), last seen, POS version.
- Add device → copy `deviceKey` to POS `.env`.
- Send commands: FORCE_SYNC, UPDATE_POS, RESTART_POS.
- View recent command status.

---

## Version / Status Display

- **Cloud**: Device card shows `posVersion` and `lastSeenAt` (Online/Offline).
- **Local**: `GET /device/status` returns `{ version, deviceConfigured }`.

---

## Changed Files

| Area       | Files |
|------------|-------|
| Cloud API  | `prisma/schema.prisma`, `prisma/migrations/...`, `src/routes/sync.ts`, `src/routes/devices.ts`, `src/index.ts` |
| Local API  | `src/index.ts`, `src/services/deviceCommandPolling.service.ts` |
| Cloud UI   | `src/lib/api.ts`, `src/app/settings/devices/page.tsx` |
| Scripts    | `scripts/windows/update-pos.cmd` |

---

## Local / Dev Testing (No Real Store)

### 1. Run cloud stack

```bash
# Start PostgreSQL for cloud-api
cd apps/cloud-api
pnpm prisma migrate deploy   # if DB exists
pnpm dev
```

```bash
# Cloud UI
cd apps/cloud-ui
NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm dev   # cloud-api port
```

### 2. Create a device in Cloud Admin

1. Log in at `http://localhost:3002` (or your cloud-ui port).
2. Go to **Settings → Devices**.
3. Add device "Test POS".
4. Copy the `deviceKey`.

### 3. Run local POS with device key

```bash
# In apps/api/.env (or inline):
CLOUD_URL=http://localhost:4000   # cloud-api URL
DEVICE_KEY=<paste-key>
STORE_SYNC_SECRET=test-secret     # if cloud requires it

cd apps/api
pnpm dev
```

### 4. Verify polling

- Cloud API logs: device heartbeat and command poll requests.
- Cloud UI: device shows "Online" and version after first heartbeat (~5 min) or after sending a command.

### 5. Test commands

- **FORCE_SYNC**: Click "FORCE SYNC" in Cloud Admin. Local API logs catalog sync.
- **RESTART_POS**: Click "RESTART POS". Local API exits; restart manually or via NSSM.
- **UPDATE_POS**: Ensure `scripts/windows/update-pos.cmd` exists. Click "UPDATE POS". Script runs (or fails if path wrong).

### 6. Offline behavior

- Stop cloud-api. Local POS continues; polling fails silently.
- Restart cloud-api. Next poll succeeds.

### 7. Use separate ports to avoid clashes

- Cloud API: 4000
- Local API: 4001 (set `PORT=4001` in apps/api)
- Cloud UI: 3002
- Local web: 3000

---

## Env Vars Summary

| App      | Var              | Description                          |
|----------|------------------|--------------------------------------|
| cloud-api| (none new)       |                                      |
| Local API| CLOUD_URL        | Cloud API base URL                   |
| Local API| DEVICE_KEY       | Device key from Cloud Admin          |
| Local API| POS_VERSION      | Optional; default 1.0.0              |
| Local API| UPDATE_SCRIPT    | Optional; path to update script      |
