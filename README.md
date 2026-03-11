# BFC QR Ordering

All system specifications are located in:

/docs

The authoritative source of truth for POS behavior is:

/docs/pos/pos-register-spec.md

Do not rely on legacy markdown files.
All architectural, payment, QR, staff, and UI rules are defined in /docs.

When making changes:
1. Follow /docs structure.
2. Update pos-register-spec.md first for any behavioral changes.
3. Keep QR and POS payment systems separated.

---

## Windows Mini PC Deployment

Scripts in `scripts/windows/` help run the POS stack on a Windows mini PC (API + web + Edge kiosk). No Docker; nothing is installed automatically.

**Prerequisites**
- Node.js (LTS) and pnpm installed.
- Microsoft Edge installed (for kiosk).
- API: `DATABASE_URL` set (e.g. in `apps/api/.env`).

**Build (once per deploy)**
```cmd
cd path\to\bfc-qr-ordering
pnpm install
pnpm --filter @bfc/api run build
pnpm --filter web run build
```

**Run production**
1. Terminal 1: `scripts\windows\start-api-prod.cmd` (API on port 4000).
2. Terminal 2: `scripts\windows\start-web-prod.cmd` (Web on port 3000).
3. When both are up: `scripts\windows\open-pos-kiosk.cmd` to open Edge in kiosk to the POS register.

**Test manually**
- API: open `http://localhost:4000/health` → `{"ok":true}`.
- Web: open `http://localhost:3000` then go to `/pos/register`.
- Kiosk script opens `http://localhost:3000/pos/register` in Edge kiosk mode.

**Where to edit ports/URLs**
- API port: `scripts/windows/start-api-prod.cmd` → `set PORT=4000`; and `apps/api` uses `PORT` (default 4000).
- Web port: `scripts/windows/start-web-prod.cmd` → `set PORT=3000`; and `apps/web` uses `next start -p 3000`.
- POS kiosk URL: `scripts/windows/open-pos-kiosk.cmd` → `set POS_URL=...`.
- Edge path: same file → `set EDGE_PATH=...` (defaults to Program Files (x86) or Program Files).