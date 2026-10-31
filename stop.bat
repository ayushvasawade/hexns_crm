@echo off
setlocal EnableDelayedExpansion

:: =============================================================================
:: HEXNS CRM - Graceful Shutdown System (Windows)
:: =============================================================================
title HEXNS CRM Shutdown
cd /d "%~dp0"

if exist "backend\.venv\Scripts\python.exe" (
    backend\.venv\Scripts\python.exe scripts\launcher.py stop
    goto :done
)

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python scripts\launcher.py stop
    goto :done
)

:: Fallback direct shutdown if Python is somehow missing
echo [INFO] Performing fallback process termination...
if exist ".run\frontend.pid" (
    set /p FE_PID=<.run\frontend.pid
    taskkill /PID !FE_PID! /T /F >nul 2>&1
    del /f /q ".run\frontend.pid" >nul 2>&1
    echo [STOP] Frontend stopped (PID: !FE_PID!).
)
if exist ".run\backend.pid" (
    set /p BE_PID=<.run\backend.pid
    taskkill /PID !BE_PID! /T /F >nul 2>&1
    del /f /q ".run\backend.pid" >nul 2>&1
    echo [STOP] Backend stopped (PID: !BE_PID!).
)

:done
pause
