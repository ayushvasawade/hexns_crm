#!/usr/bin/env bash
# ==============================================================================
# HEXNS CRM - Cross-Platform One-Click Startup System (macOS)
# ==============================================================================

# Ensure script navigates to the project root directory regardless of how it was launched
cd "$(cd "$(dirname "$0")" && pwd)" || exit 1

# Formatting
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

printf "\033]0;%s\007" "HEXNS CRM Launcher"

echo -e "${CYAN}${BOLD}======================================================================${RESET}"
echo -e "${CYAN}${BOLD}                HEXNS CRM - One-Click Startup System                 ${RESET}"
echo -e "${CYAN}${BOLD}======================================================================${RESET}"
echo ""

# 1. Initialize Directories
mkdir -p .run logs

# 2. Check Prerequisites: Python
echo -e "${BOLD}[1/6] Checking Python installation...${RESET}"
PYTHON_CMD=""

if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>/dev/null; then
        PYTHON_CMD="python3"
    fi
fi

if [ -z "$PYTHON_CMD" ] && command -v python >/dev/null 2>&1; then
    if python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>/dev/null; then
        PYTHON_CMD="python"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}[ERROR] Python 3.10+ was not found on your system.${RESET}"
    echo "HEXNS CRM backend requires Python (Python 3.12 or 3.13 recommended)."
    echo ""

    if command -v brew >/dev/null 2>&1; then
        read -r -p "Homebrew detected. Would you like to install Python 3.12 now via brew? [y/N]: " install_py
        if [[ "$install_py" =~ ^[Yy]$ ]]; then
            echo "Installing Python 3.12 with Homebrew..."
            brew install python@3.12
            PYTHON_CMD="python3"
        fi
    fi

    if [ -z "$PYTHON_CMD" ]; then
        echo -e "${YELLOW}Installation Options:${RESET}"
        echo "  1. Install Homebrew (https://brew.sh) and run: brew install python@3.12"
        echo "  2. Or download official macOS installer: https://www.python.org/downloads/mac-osx/"
        echo ""
        read -r -p "Press Enter to exit..."
        exit 1
    fi
fi

PY_VER=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}[OK] Found $PY_VER${RESET}"

# 3. Check Prerequisites: Node.js & npm
echo -e "${BOLD}[2/6] Checking Node.js and npm...${RESET}"
NODE_CMD=""
NPM_CMD=""

if command -v node >/dev/null 2>&1; then
    if node -e "const v=parseInt(process.versions.node.split('.')[0]);process.exit(v>=18?0:1)" 2>/dev/null; then
        NODE_CMD="node"
    fi
fi

if command -v npm >/dev/null 2>&1; then
    NPM_CMD="npm"
fi

if [ -z "$NODE_CMD" ] || [ -z "$NPM_CMD" ]; then
    echo -e "${RED}[ERROR] Node.js 18.18+ or npm was not found on your system.${RESET}"
    echo "HEXNS CRM frontend requires Node.js (Node 20 or 22 LTS recommended)."
    echo ""

    if command -v brew >/dev/null 2>&1; then
        read -r -p "Homebrew detected. Would you like to install Node.js now via brew? [y/N]: " install_node
        if [[ "$install_node" =~ ^[Yy]$ ]]; then
            echo "Installing Node.js with Homebrew..."
            brew install node
            NODE_CMD="node"
            NPM_CMD="npm"
        fi
    fi

    if [ -z "$NODE_CMD" ] || [ -z "$NPM_CMD" ]; then
        echo -e "${YELLOW}Installation Options:${RESET}"
        echo "  1. Install Homebrew (https://brew.sh) and run: brew install node"
        echo "  2. Or download official macOS installer: https://nodejs.org/"
        echo ""
        read -r -p "Press Enter to exit..."
        exit 1
    fi
fi

NODE_VER=$(node --version 2>&1)
NPM_VER=$(npm --version 2>&1)
echo -e "${GREEN}[OK] Found Node.js $NODE_VER and npm $NPM_VER${RESET}"

# 4. Backend Virtual Environment Setup
echo -e "${BOLD}[3/6] Setting up backend environment...${RESET}"
VENV_PY="backend/.venv/bin/python"

if [ ! -f "$VENV_PY" ]; then
    echo -e "${YELLOW}[SETUP] Creating Python virtual environment in backend/.venv...${RESET}"
    $PYTHON_CMD -m venv backend/.venv || {
        echo -e "${RED}[ERROR] Failed to create virtual environment.${RESET}"
        read -r -p "Press Enter to exit..."
        exit 1
    }
    echo -e "${YELLOW}[SETUP] Upgrading pip...${RESET}"
    $VENV_PY -m pip install --upgrade pip --quiet
    echo -e "${YELLOW}[SETUP] Installing backend dependencies from requirements.txt...${RESET}"
    $VENV_PY -m pip install -r backend/requirements.txt || {
        echo -e "${RED}[ERROR] Failed to install backend dependencies.${RESET}"
        read -r -p "Press Enter to exit..."
        exit 1
    }
    echo -e "${GREEN}[OK] Backend virtual environment created successfully.${RESET}"
else
    echo -e "${GREEN}[OK] Backend virtual environment verified.${RESET}"
    if ! $VENV_PY -c "import fastapi, uvicorn, pydantic" >/dev/null 2>&1; then
        echo -e "${YELLOW}[SETUP] Installing missing backend packages...${RESET}"
        $VENV_PY -m pip install -r backend/requirements.txt || {
            echo -e "${RED}[ERROR] Failed to install backend dependencies.${RESET}"
            read -r -p "Press Enter to exit..."
            exit 1
        }
    fi
fi

# 5. Frontend Dependencies Setup
echo -e "${BOLD}[4/6] Setting up frontend dependencies...${RESET}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[SETUP] Installing frontend dependencies (this may take 1-2 minutes)...${RESET}"
    (
        cd frontend || exit 1
        if [ -f "package-lock.json" ]; then
            npm ci 2>/dev/null || npm install
        else
            npm install
        fi
    )
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${RED}[ERROR] Frontend dependencies failed to install.${RESET}"
        read -r -p "Press Enter to exit..."
        exit 1
    fi
    echo -e "${GREEN}[OK] Frontend dependencies installed successfully.${RESET}"
else
    echo -e "${GREEN}[OK] Frontend node_modules verified.${RESET}"
fi

# 6. Environment Configuration Verification
echo -e "${BOLD}[5/6] Verifying environment configurations...${RESET}"
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp "backend/.env.example" "backend/.env"
        echo -e "${YELLOW}[SETUP] Created backend/.env from template.${RESET}"
        echo -e "${YELLOW}[IMPORTANT] Please update DATABASE_URL in backend/.env with your live Neon PostgreSQL credentials.${RESET}"
    fi
fi

if [ ! -f "frontend/.env.local" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp "frontend/.env.example" "frontend/.env.local"
        echo -e "${YELLOW}[SETUP] Created frontend/.env.local from template.${RESET}"
    fi
fi

if grep -q "ep-example.neon.tech" "backend/.env" 2>/dev/null; then
    echo -e "${YELLOW}[NOTICE] backend/.env is currently using placeholder Neon credentials.${RESET}"
    echo -e "${YELLOW}         Database features require valid Neon credentials and an active internet connection.${RESET}"
fi

# 7. Launch Services via Service Orchestrator
echo -e "${BOLD}[6/6] Launching application services...${RESET}"
$VENV_PY scripts/launcher.py start

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Startup failed. Please check the logs above.${RESET}"
fi

read -r -p "Press Enter to exit this launcher window (services remain running)..." || true
exit $EXIT_CODE

