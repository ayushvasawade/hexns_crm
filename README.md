# HEXNS Mediaworks — Billing & Quotation CRM

> **Enterprise billing, quotation, invoicing, and financial management system for HEXNS Mediaworks.**

---

## Quickstart: One-Click Startup System

You can run the entire CRM without manually opening multiple terminals or typing commands. The project includes automated one-click startup and shutdown scripts for **Windows** and **macOS**.

| Action | Windows | macOS |
| :--- | :--- | :--- |
| **Start Application** | Double-click `start.bat` | Double-click `start.command` |
| **Stop Application** | Double-click `stop.bat` | Double-click `stop.command` |

When you launch `start.bat` or `start.command`:
1. System prerequisites (**Python 3.10+** and **Node.js 18+**) are automatically checked.
2. The Python virtual environment (`backend/.venv`) is created and dependencies are installed automatically on first launch.
3. Frontend dependencies (`frontend/node_modules`) are installed automatically if missing.
4. Environment files (`backend/.env` and `frontend/.env.local`) are initialized from safe templates if not present.
5. The **FastAPI** backend starts, binds to port `8000`, and verifies health at `/health`.
6. The **Next.js 15** frontend starts, binds to port `3000`, and compiles the application.
7. Your default web browser opens automatically to **[http://localhost:3000](http://localhost:3000)** once all services are healthy.

---

## 1. System Requirements

Ensure the following runtimes are installed on your machine before the first launch:

| Component | Minimum Version | Recommended Version |
| :--- | :--- | :--- |
| **Python** | `3.10` | `3.12` or `3.13` |
| **Node.js** | `18.18.0` | `20.x LTS` or `22.x LTS` |
| **npm** | `9.x` | `10.x` or higher |
| **Internet** | Required | Active connection for Neon PostgreSQL |

---

## 2. First-Time Setup Instructions

### Windows Setup

1. **Install Python (3.12 or 3.13)**:
   - Download the official installer from [python.org/downloads](https://www.python.org/downloads/).
   - **CRITICAL**: On the very first installation screen, check the box:
     `[x] Add python.exe to PATH`.
   - Alternatively, install via Windows Terminal / PowerShell:
     ```powershell
     winget install Python.Python.3.13
     ```
2. **Install Node.js (LTS)**:
   - Download the LTS installer from [nodejs.org](https://nodejs.org/).
   - Follow standard installer prompts.
   - Alternatively, install via Windows Terminal / PowerShell:
     ```powershell
     winget install OpenJS.NodeJS.LTS
     ```
3. **Configure Environment Variables**:
   - See [Environment Configuration](#4-environment-configuration) below to connect your Neon PostgreSQL database.
4. **Launch**:
   - Double-click **`start.bat`**.

---

### macOS Setup

1. **Install Prerequisites**:
   - If you have **Homebrew** installed, the script can offer to install Python and Node.js automatically when run.
   - Alternatively, install them manually:
     ```bash
     brew install python@3.12 node
     ```
   - Or download official packages from [python.org](https://www.python.org/downloads/mac-osx/) and [nodejs.org](https://nodejs.org/).
2. **Make Scripts Executable** (if downloaded as a `.zip` archive):
   - macOS may strip execution permissions from downloaded script files. Open Terminal in the project folder and run:
     ```bash
     chmod +x start.command stop.command
     ```
3. **Configure Environment Variables**:
   - See [Environment Configuration](#4-environment-configuration) below.
4. **Launch**:
   - Double-click **`start.command`** in Finder.

---

## 3. One-Click Operation Guide

### Starting the System (`start.bat` / `start.command`)
- Simply double-click the startup script for your operating system.
- The terminal displays a live progress dashboard checking prerequisites, installing any missing packages, starting the backend, starting the frontend, and verifying service health.
- Once both services are confirmed healthy, your browser opens automatically to **[http://localhost:3000](http://localhost:3000)**.
- If the application is already running, the startup script detects existing healthy instances, avoids starting duplicate processes, and displays the running application status without opening duplicate browser tabs.

### Stopping the System (`stop.bat` / `stop.command`)
- Double-click the shutdown script for your operating system.
- The shutdown script reads stored process IDs from `.run/`, gracefully terminates both the Next.js and FastAPI process trees (including any worker or child processes), verifies that ports `3000` and `8000` are clean, removes PID files, and displays a shutdown confirmation.
- It safely ignores processes that were already stopped and will never terminate unrelated Python or Node applications.

---

## 4. Environment Configuration

### Backend: `backend/.env`
The backend requires configuration to connect to your **Neon PostgreSQL** database.

If `backend/.env` is missing, the startup script automatically creates it from `backend/.env.example`. Open `backend/.env` in an editor and verify:

```ini
# Application Environment
APP_ENV=development
ENVIRONMENT=development
DEBUG=True
PROJECT_NAME="HEXNS Mediaworks API"
VERSION=0.1.0

# CORS Allowed Origins
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Neon PostgreSQL Database Connection Strings
# Replace USER, PASSWORD, and ep-example.neon.tech with your actual Neon credentials
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@ep-example.neon.tech/hexns_crm?ssl=require
SYNC_DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@ep-example.neon.tech/hexns_crm?sslmode=require

# Connection Pool Settings
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_PRE_PING=True
DATABASE_ECHO=False

# Authentication (Change to a long random secret for production)
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> **IMPORTANT**:
> - **Neon PostgreSQL requires an active internet connection.** If your computer is offline or disconnected, database queries will time out.
> - Never commit `backend/.env` to source control. It is ignored by `.gitignore`.

### Frontend: `frontend/.env.local`
If `frontend/.env.local` is missing, the startup script automatically creates it from `frontend/.env.example`:

```ini
# Base URL for FastAPI backend API (v1 prefix)
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_APP_NAME="HEXNS Mediaworks"
NEXT_PUBLIC_ENVIRONMENT=development
```

---

## 5. Application URLs & Ports

When the services are running:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Main CRM user interface |
| **Backend API Root** | [http://127.0.0.1:8000](http://127.0.0.1:8000) | API welcome & status |
| **Backend Health Check** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | System health probe |
| **API v1 Health** | [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) | API v1 endpoint health |
| **Interactive API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Swagger UI for testing API endpoints |
| **Alternative API Docs** | [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc) | ReDoc API documentation |

---

## 6. Logs & Diagnostic Files

Logs are written locally to the `logs/` directory in the repository root:

- **Backend Log**: `logs/backend.log` (FastAPI / Uvicorn server logs, database pool events, errors)
- **Frontend Log**: `logs/frontend.log` (Next.js compilation logs, page builds, client requests)

Runtime process tracking:
- Process IDs are stored in `.run/backend.pid` and `.run/frontend.pid`.
- Both `logs/` and `.run/` are ignored by git.

---

## 7. Dependency Installation Behavior

- **Fast & Idempotent**: Dependencies are checked quickly on startup. If `backend/.venv` and `frontend/node_modules` are already intact, installation is skipped to ensure the fastest possible startup (typically 1-3 seconds).
- **Virtual Environment Isolation**: Python dependencies are always installed in `backend/.venv`. Global packages are never modified.
- **Clean Lockfile Usage**: When installing frontend dependencies, `npm ci` is preferred whenever `package-lock.json` is present to maintain identical package versions without modifying the lockfile.

---

## 8. Troubleshooting Common Errors

### 1. `Port 8000 is occupied by another process` or `Port 3000 is occupied`
- **Cause**: An earlier session did not exit cleanly, or another application is using port 8000 or 3000.
- **Solution**:
  1. Double-click `stop.bat` (Windows) or `stop.command` (macOS) to terminate lingering project processes.
  2. If the port is held by another software, find and close that application, or free the port:
     - On Windows: Run `netstat -ano | findstr :8000` to find the PID, then `taskkill /PID <PID> /F`.
     - On macOS: Run `lsof -i :8000` to find the PID, then `kill -9 <PID>`.

### 2. `Python was not found` / Windows opens the Microsoft Store
- **Cause**: Python is not installed or "Add python.exe to PATH" was not checked during installation.
- **Solution**: Re-run the Python installer from [python.org](https://www.python.org/downloads/), choose **Modify**, and ensure **Add Python to environment variables** is checked.

### 3. Database connection errors / `asyncpg.exceptions.ConnectionDoesNotExistError`
- **Cause**: Neon PostgreSQL credentials in `backend/.env` are invalid or your computer is offline.
- **Solution**:
  1. Verify your internet connection.
  2. Check `backend/.env` and ensure `DATABASE_URL` contains your active Neon connection string with valid username, password, and host (not `USER:PASSWORD@ep-example.neon.tech`).

### 4. Permission Denied on macOS (`start.command`)
- **Cause**: File execution permission is missing.
- **Solution**: Open Terminal in the project root and run:
  ```bash
  chmod +x start.command stop.command
  ```

---

## 9. Manual Developer Workflow

If you prefer to run services manually for debugging or database migrations:

### Backend Manual Run
```bash
cd backend
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Start server
uvicorn app.main:app --reload --port 8000

# Run automated tests
pytest
```

### Database Migrations (Alembic)
Ensure a valid Neon connection string is set in `backend/.env`, then:
```bash
cd backend
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows

# Generate migration
alembic revision --autogenerate -m "description_of_change"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

### Frontend Manual Run
```bash
cd frontend
npm install
npm run dev -- -p 3000

# Linting and production build check
npm run lint
npm run build
```

---

## 10. Security & Credentials Safety

- All database credentials, JWT keys, and API secrets reside exclusively in local `.env` and `.env.local` files.
- These files are strictly excluded from git tracking.
- Scripts and log files never expose passwords or secret tokens.
