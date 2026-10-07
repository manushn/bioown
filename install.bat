@echo off
title Setup - College Staff Attendance System
echo ===================================================
echo  College Staff Attendance System - Windows Setup
echo ===================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/2] Installing npm dependencies across all workspaces...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] npm install encountered an error.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Initializing SQLite database and admin account...
call npm run init-db

echo.
echo ===================================================
echo  Setup completed successfully!
echo  You can now double-click "start.bat" to run the app.
echo ===================================================
echo.
pause

