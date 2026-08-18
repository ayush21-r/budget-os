@echo off
title BudgetOS Developer Console
color 0B
cls

echo ==========================================================
echo          INITIALIZING BUDGETOS SYSTEM ENVIRONMENT
echo ==========================================================
echo.
echo     ____  __  ______   _________________  ____  _____
echo    / __ )/ / / / __ \ / ____/ ____/_  __/ / __ \/ ___/
echo   / __  / / / / / / // / __/ __/   / /   / / / /\__ \ 
echo  / /_/ / /_/ / /_/ // /_/ / /___  / /   / /_/ /___/ / 
echo /_____/\____/_____/ \____/_____/ /_/    \____//____/  
echo.
echo ==========================================================
echo.
echo  [+] Status: System Ready
echo  [+] Host:   http://localhost:5173
echo  [+] Action: Launching browser trigger...
echo.

:: Start a background process that waits 3 seconds and opens the website
start /b cmd /c "ping 127.0.0.1 -n 4 >nul && start http://localhost:5173"

echo  [+] Launching Vite Developer Server...
echo ----------------------------------------------------------
echo.

cd /d "%~dp0"
npm.cmd run dev
