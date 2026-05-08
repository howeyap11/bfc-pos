@echo off
setlocal
REM Start web app in production. Run from repo root or scripts\windows. Build first: pnpm --filter web run build

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "WEB_DIR=%ROOT%\apps\web"

set PORT=3000
set NODE_ENV=production
cd /d "%WEB_DIR%"
if not exist ".next\BUILD_ID" (
  echo Production web build not found. Run: pnpm --filter web run build
  exit /b 1
)
call pnpm start:prod
