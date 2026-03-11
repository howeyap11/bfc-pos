@echo off
setlocal
REM Start API in production. Run from repo root or scripts\windows. Build first: pnpm --filter @bfc/api run build

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "API_DIR=%ROOT%\apps\api"

set PORT=4000
cd /d "%API_DIR%"
node dist\index.js
