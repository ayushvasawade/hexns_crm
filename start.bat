@echo off
setlocal EnableDelayedExpansion

:: =============================================================================
:: HEXNS CRM - Cross-Platform One-Click Startup System (Windows)
:: =============================================================================
title HEXNS CRM Launcher
cd /d "%~dp0"

echo ======================================================================
echo                 HEXNS CRM - One-Click Startup System
echo ======================================================================
echo(

:: 1. Initialize Directories
if not exist ".run" mkdir .run
if not exist "logs" mkdir logs

:: 2. Check Prerequisites: Python
echo [1/6] Checking Python installation...
set "PYTHON_CMD="

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
    if !ERRORLEVEL! equ 0 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    where py >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
        if !ERRORLEVEL! equ 0 set "PYTHON_CMD=py -3"
    )
)

if not defined PYTHON_CMD goto :missing_python

for /f "tokens=*" %%v in ('%PYTHON_CMD% --version 2^>^&1') do set "PY_VER=%%v"
echo [OK] Found %PY_VER%

:: 3. Check Prerequisites: Node.js & npm
echo [2/6] Checking Node.js and npm...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 goto :missing_node

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 goto :missing_node

node -e "const v=parseInt(process.versions.node.split('.')[0]);process.exit(v>=18?0:1)" >nul 2>&1
if %ERRORLEVEL% neq 0 goto :unsupported_node

for /f "tokens=*" %%v in ('node --version 2^>^&1') do set "NODE_VER=%%v"
for /f "tokens=*" %%v in ('npm --version 2^>^&1') do set "NPM_VER=%%v"
echo [OK] Found Node.js %NODE_VER% and npm %NPM_VER%
goto :check_venv

:unsupported_node
echo(
echo ======================================================================
echo [ERROR] Installed Node.js version is unsupported.
echo ======================================================================
echo Next.js 15 requires Node.js 18.18+ (Node 20 or 22 LTS recommended).
echo Current version:
node --version
echo Please install a modern Node.js LTS release from https://nodejs.org/
echo ======================================================================
echo(
pause
exit /b 1

:missing_python
echo(
echo ======================================================================
echo [ERROR] Python 3.10+ was not found on your system.
echo ======================================================================
echo HEXNS CRM backend requires Python (Python 3.12 or 3.13 recommended).
echo(
echo Installation Options:
echo   1. Download the official installer:
echo      https://www.python.org/downloads/
echo      IMPORTANT: Check the box "Add python.exe to PATH" during setup!
echo(
echo   2. Or install via Windows Terminal / PowerShell:
echo      winget install Python.Python.3.13
echo(
echo Please install Python and double-click start.bat again.
echo ======================================================================
echo(
pause
exit /b 1

:missing_node
echo(
echo ======================================================================
echo [ERROR] Node.js or npm was not found on your system.
echo ======================================================================
echo HEXNS CRM frontend requires Node.js (Node 20 or 22 LTS recommended).
echo(
echo Installation Options:
echo   1. Download the official installer:
echo      https://nodejs.org/
echo(
echo   2. Or install via Windows Terminal / PowerShell:
echo      winget install OpenJS.NodeJS.LTS
echo(
echo Please install Node.js and double-click start.bat again.
echo ======================================================================
echo(
pause
exit /b 1

:check_venv
:: 4. Backend Virtual Environment Setup
echo [3/6] Setting up backend environment...
if exist "backend\.venv\Scripts\python.exe" goto :venv_exists

echo [SETUP] Creating Python virtual environment in backend\.venv...
%PYTHON_CMD% -m venv backend\.venv
if %ERRORLEVEL% neq 0 goto :err_create_venv

echo [SETUP] Upgrading pip...
backend\.venv\Scripts\python.exe -m pip install --upgrade pip --quiet

echo [SETUP] Installing backend dependencies from requirements.txt...
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if %ERRORLEVEL% neq 0 goto :err_install_backend
echo [OK] Backend environment created successfully.
goto :check_frontend_deps

:err_create_venv
echo [ERROR] Failed to create Python virtual environment.
pause
exit /b 1

:err_install_backend
echo [ERROR] Failed to install backend dependencies.
pause
exit /b 1

:venv_exists
echo [OK] Backend virtual environment verified.
backend\.venv\Scripts\python.exe -c "import fastapi, uvicorn, pydantic" >nul 2>&1
if %ERRORLEVEL% equ 0 goto :check_frontend_deps

echo [SETUP] Installing missing backend packages...
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if %ERRORLEVEL% neq 0 goto :err_install_backend

:check_frontend_deps
:: 5. Frontend Dependencies Setup
echo [4/6] Setting up frontend dependencies...
if exist "frontend\node_modules" goto :frontend_deps_ok

echo [SETUP] Installing frontend dependencies (this may take 1-2 minutes)...
pushd frontend
if exist "package-lock.json" goto :do_npm_ci
call npm install
goto :after_npm_install

:do_npm_ci
call npm ci
if %ERRORLEVEL% neq 0 (
    echo [WARNING] npm ci failed, falling back to npm install...
    call npm install
)

:after_npm_install
popd

if not exist "frontend\node_modules" (
    echo [ERROR] Frontend dependencies failed to install.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed successfully.
goto :check_env_files

:frontend_deps_ok
echo [OK] Frontend node_modules verified.

:check_env_files
:: 6. Environment Configuration Verification
echo [5/6] Verifying environment configurations...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo [SETUP] Created backend\.env from template.
        echo [IMPORTANT] Please update DATABASE_URL in backend\.env with your live Neon PostgreSQL credentials.
    )
)

if not exist "frontend\.env.local" (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env.local" >nul
        echo [SETUP] Created frontend\.env.local from template.
    )
)

findstr /C:"ep-example.neon.tech" "backend\.env" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [NOTICE] backend\.env is currently using placeholder Neon credentials.
    echo          Database features require valid Neon credentials and an active internet connection.
)

:: 7. Launch Application Services via Service Orchestrator
echo [6/6] Launching application services...
backend\.venv\Scripts\python.exe scripts\launcher.py start
if %ERRORLEVEL% neq 0 (
    echo(
    echo [ERROR] Service startup encountered an issue. See logs above.
    pause
    exit /b 1
)

pause
