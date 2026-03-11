# Launch-Critical Checklist: Windows Mini PC Café Deployment

Use this checklist before going live. Each item can break operations if not verified.

---

## 1. Local API service starts on boot

- [ ] BfcPosApi Windows service is installed (see `docs/windows-service-api.md`)
- [ ] Service is set to **Automatic** startup
- [ ] `nssm status BfcPosApi` shows **SERVICE_RUNNING** after reboot
- [ ] `http://localhost:4000/health` returns `{"ok":true}`

---

## 2. Frontend opens automatically

- [ ] Web app starts on boot (e.g. Task Scheduler running `scripts\windows\start-web-prod.cmd` or equivalent)
- [ ] `scripts\windows\open-pos-kiosk.cmd` (or shortcut) is in Startup folder, or Task Scheduler runs it at login
- [ ] Edge opens to `http://localhost:3000/pos/register` in kiosk mode

---

## 3. Localhost connectivity

- [ ] API reachable at `http://127.0.0.1:4000/health`
- [ ] Web reachable at `http://localhost:3000`
- [ ] Web can reach API: `http://localhost:3000/api/health` returns `{"web":"ok","backend":"ok"}`
- [ ] No firewall blocking ports 3000 or 4000 on localhost

---

## 4. Receipt printer access

- [ ] Receipt printer is set as default Windows printer (or configured for POS)
- [ ] Test print from another app (e.g. Notepad) succeeds
- [ ] POS “Receipt” button triggers print (or known workaround if not yet implemented)

---

## 5. Local database path and permissions

- [ ] `DATABASE_URL` in `apps/api/.env` points to valid SQLite path (e.g. `file:./prisma/dev.db`)
- [ ] Database file and parent directory exist and are writable by the service/user
- [ ] API working directory is `apps/api` (so relative paths resolve correctly)
- [ ] No “database is locked” or permission errors in `apps/api/logs/api-stderr.log`

---

## 6. Offline startup

- [ ] API starts and serves `/menu`, `/health`, `/ready` without internet
- [ ] Web app loads and shows “Starting POS…” then register when API is up
- [ ] Catalog and orders load from local DB (offline-first)

---

## 7. Pending orders page works

- [ ] Staff logged in (localStorage `bfc_active_staff` has valid staffKey)
- [ ] Navigate to **Orders** → **Pending Orders** tab
- [ ] Orders list loads without error
- [ ] QR Orders tab also loads

---

## 8. Order creation works

- [ ] Register is open (or open it via `/pos`)
- [ ] Add items to cart and complete a test transaction
- [ ] Payment completes and success screen shows
- [ ] Order appears in **Orders** (QR or Pending as applicable)

---

## 9. Reboot test works

- [ ] Reboot the mini PC
- [ ] After boot: API service is running, web app is up, Edge kiosk opens to POS
- [ ] Health check passes, register loads, no “Starting POS…” stuck
- [ ] One full order flow works after reboot

---

## Quick reference

| Item        | Port / Path                                           |
|-------------|--------------------------------------------------------|
| API         | `http://localhost:4000`                                |
| Web         | `http://localhost:3000`                                |
| Kiosk URL   | `http://localhost:3000/pos/register`                   |
| DB path     | `apps/api/.env` → `DATABASE_URL`                       |
| Service     | `BfcPosApi`                                           |
| API logs    | `apps/api/logs/api-stdout.log`, `api-stderr.log`      |
