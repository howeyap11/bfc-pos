@echo off
REM Update POS: pull latest, install, build, then restart API
REM Customize this script for your deployment (e.g. git pull path, build commands).
REM Set UPDATE_SCRIPT in apps/api/.env to override path.

cd /d "%~dp0..\.."
echo [update-pos] Starting at %CD%

REM Optional: git pull (uncomment if using git)
REM git pull origin main

call pnpm install
if errorlevel 1 goto :error

call pnpm run build
if errorlevel 1 goto :error

REM Restart API service if running as Windows service
REM nssm restart BfcPosApi
REM If not using NSSM, the parent process will restart after this script exits 0.

echo [update-pos] Done
exit /b 0

:error
echo [update-pos] Failed
exit /b 1
