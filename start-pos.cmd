@echo off
setlocal
echo Starting BFC POS...

set "ROOT=%~dp0"

start "BFC POS API" cmd /k "cd /d ""%ROOT%"" && scripts\windows\start-api-prod.cmd"
timeout /t 3 > nul
start "BFC POS Web" cmd /k "cd /d ""%ROOT%"" && scripts\windows\start-web-prod.cmd"

timeout /t 5 > nul

for /f %%S in ('curl.exe -s -o nul -w "%%{http_code}" "http://localhost:3000/_next/static/development/_devPagesManifest.json"') do set "DEV_MANIFEST_STATUS=%%S"
if "%DEV_MANIFEST_STATUS%"=="200" (
  echo ERROR: localhost:3000 is serving Next.js development mode.
  echo Stop the dev server and run scripts\windows\start-web-prod.cmd after building the web app.
  exit /b 1
)

call scripts\windows\open-pos-kiosk.cmd

echo POS started.