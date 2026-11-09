@echo off
setlocal
title HEXNS CRM Shutdown
cd /d "%~dp0"

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" "scripts\launcher.py" stop
    exit /b %ERRORLEVEL%
)
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py -3 "scripts\launcher.py" stop
    exit /b %ERRORLEVEL%
)
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python "scripts\launcher.py" stop
    exit /b %ERRORLEVEL%
)
echo [ERROR] Python is required to safely read CRM process ownership records.
exit /b 1
