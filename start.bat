@echo off
setlocal
title HEXNS CRM Launcher
cd /d "%~dp0"

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" "scripts\launcher.py" start
    exit /b %ERRORLEVEL%
)
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py -3 "scripts\launcher.py" start
    exit /b %ERRORLEVEL%
)
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python "scripts\launcher.py" start
    exit /b %ERRORLEVEL%
)
echo [ERROR] Python 3.10+ is required. Install Python and run start.bat again.
exit /b 1
