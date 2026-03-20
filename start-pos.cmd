@echo off
echo Starting BFC POS...

start cmd /k "cd /d C:\BFC-POS\apps\api && pnpm start"
timeout /t 3 > nul
start cmd /k "cd /d C:\BFC-POS\apps\web && pnpm start"

timeout /t 5 > nul
start msedge --app=http://localhost:3000

echo POS started.