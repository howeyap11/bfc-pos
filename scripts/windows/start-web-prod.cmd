@echo off
setlocal
REM Start web app in production. Run from repo root or scripts\windows. Build first: pnpm --filter web run build

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "WEB_DIR=%ROOT%\apps\web"

set PORT=3000
cd /d "%WEB_DIR%"
call pnpm start:prod
