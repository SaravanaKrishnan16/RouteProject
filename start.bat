@echo off
echo Starting RouteIQ Platform...
echo.
echo Backend  → http://localhost:3001
echo Frontend → http://localhost:5173
echo.
echo Network Access (other laptops):
echo Frontend → http://192.168.32.159:5173
echo.
echo Demo credentials: demo@routeiq.ai / demo123
echo.
echo Installing backend dependencies...
cd /d %~dp0platform\backend && npm install
echo Installing frontend dependencies...
cd /d %~dp0platform\frontend && npm install
cd /d %~dp0
start "RouteIQ Backend" cmd /k "cd /d %~dp0platform\backend && node server.js"
timeout /t 2 /nobreak >nul
start "RouteIQ Frontend" cmd /k "cd /d %~dp0platform\frontend && npm run dev"
timeout /t 4 /nobreak >nul
echo.
echo Opening browser...
start http://localhost:5173
echo.
echo Share this with other laptops on same WiFi:
echo http://192.168.32.159:5173
