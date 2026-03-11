@echo off
setlocal
REM Open POS in Edge kiosk mode. Ensure API and web are running first (start-api-prod.cmd, start-web-prod.cmd).
REM Edit POS_URL or EDGE_PATH below if needed.

set "POS_URL=http://localhost:3000/pos/register"
set "EDGE_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_PATH%" set "EDGE_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

start "" "%EDGE_PATH%" --kiosk "%POS_URL%"
