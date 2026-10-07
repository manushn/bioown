@echo off
title Launcher - College Staff Attendance System
echo ===================================================
echo  Starting College Staff Attendance System
echo ===================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Launching Backend Local API (Port 5001)...
start "Attendance Local API (Port 5001)" cmd /k "npm run dev:api"

echo [2/2] Launching Web UI with Vite (Port 5173)...
start "Attendance Frontend (Port 5173)" cmd /k "npm run dev:web"

echo.
echo Waiting for servers to start...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===================================================
echo  Both services are running!
echo  Default Admin Login: niadmin / ni2027
echo  Keep the terminal windows open while using the app.
echo ===================================================
echo.

