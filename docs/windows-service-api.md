# Running apps/api as a Windows Service with NSSM

This document describes how to run the BFC POS API (`apps/api`) as a Windows service using [NSSM](https://nssm.cc/) (Non-Sucking Service Manager). Node.js and pnpm are assumed to be already installed; the API must be built before installing the service.

**Safest command to run the built API in production (without NSSM):**

From the API directory, with environment set (e.g. via `apps/api/.env` containing `DATABASE_URL` and optionally `PORT`):

```cmd
cd /d "D:\Work\BFC QR Menu\bfc-qr-ordering\apps\api"
node dist\index.js
```

Use your actual repo path instead of `D:\Work\BFC QR Menu\bfc-qr-ordering`. The process uses `dotenv` to load `.env` from the current working directory, so `DATABASE_URL` and `PORT` can live there. Exiting the console or closing the window will stop the API.

---

## Prerequisites

- NSSM installed (download from [nssm.cc](https://nssm.cc/download) and extract, or use `nssm` from PATH).
- Node.js and pnpm installed; API built (`pnpm --filter @bfc/api run build` from repo root so `apps/api/dist/index.js` exists).
- `DATABASE_URL` available for the service (via `.env` in `apps/api` or via NSSM environment, see below).

## Paths to set

Replace these with your actual paths in the commands below:

| Variable | Example |
|----------|---------|
| `REPO_ROOT` | `D:\Work\BFC QR Menu\bfc-qr-ordering` |
| `API_DIR` | `%REPO_ROOT%\apps\api` |
| `NODE_EXE` | `C:\Program Files\nodejs\node.exe` (or where `node.exe` is installed) |

## 1. Create log directory

```cmd
mkdir "%API_DIR%\logs"
```

## 2. Install the service

Run **Command Prompt or PowerShell as Administrator**. Use the same `REPO_ROOT` and `NODE_EXE` as above.

```cmd
set REPO_ROOT=D:\Work\BFC QR Menu\bfc-qr-ordering
set API_DIR=%REPO_ROOT%\apps\api
set NODE_EXE=C:\Program Files\nodejs\node.exe

nssm install BfcPosApi "%NODE_EXE%" "dist\index.js"
```

- **Service name:** `BfcPosApi`
- **Application path:** full path to `node.exe` (`%NODE_EXE%`)
- **Application parameters:** `dist\index.js` (resolved relative to working directory)

## 3. Set working directory

```cmd
nssm set BfcPosApi AppDirectory "%API_DIR%"
```

## 4. Set stdout and stderr log paths

```cmd
nssm set BfcPosApi AppStdout "%API_DIR%\logs\api-stdout.log"
nssm set BfcPosApi AppStderr "%API_DIR%\logs\api-stderr.log"
nssm set BfcPosApi AppStdoutCreationDisposition 4
nssm set BfcPosApi AppStderrCreationDisposition 4
```

`4` = append (create file if missing, append on restart).

## 5. Restart behavior

```cmd
nssm set BfcPosApi AppExitBehavior Restart
nssm set BfcPosApi AppRestartDelay 3000
```

Service will restart the process if it exits; 3 second delay before restart.

## 6. Environment (optional)

If you do **not** use a `.env` file in `apps/api`, set required env vars for the service:

```cmd
nssm set BfcPosApi AppEnvironmentExtra "DATABASE_URL=file:./prisma/dev.db" "PORT=4000" "NODE_ENV=production"
```

Use your real `DATABASE_URL` (e.g. path to your SQLite file). Separate multiple entries with space; values with spaces must be quoted. Alternatively, put `DATABASE_URL` and `PORT` in `apps/api/.env` and leave `AppEnvironmentExtra` unset; the API loads `.env` from the working directory.

## 7. Start the service

```cmd
nssm start BfcPosApi
```

## Useful NSSM commands

| Action | Command |
|--------|---------|
| Start | `nssm start BfcPosApi` |
| Stop | `nssm stop BfcPosApi` |
| Restart | `nssm restart BfcPosApi` |
| Status | `nssm status BfcPosApi` |
| Remove service | `nssm remove BfcPosApi confirm` |

## Summary

| Setting | Value |
|---------|--------|
| Service name | `BfcPosApi` |
| Application | Full path to `node.exe` |
| Parameters | `dist\index.js` |
| Working directory | `%REPO_ROOT%\apps\api` |
| Stdout log | `%API_DIR%\logs\api-stdout.log` |
| Stderr log | `%API_DIR%\logs\api-stderr.log` |
| Restart on exit | Yes, after 3 seconds |
