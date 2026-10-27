# HEXNS Mediaworks — Billing & Quotation Software

Technical foundation for the enterprise billing, quotation, invoicing, and financial management system for **HEXNS Mediaworks**.

---

## 1. Project Architecture

The application is structured as a high-performance monorepo:
- **`backend/`**: Modular monolithic backend built with **FastAPI**, **SQLAlchemy 2 (Async)**, **asyncpg**, and **Alembic**, designed for **Neon PostgreSQL**.
- **`frontend/`**: Modern web client built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, and **Vanilla CSS / CSS Modules** utilizing custom design tokens.

---

## 2. Prerequisites

- **Python**: `>= 3.12` (Python 3.13 recommended)
- **Node.js**: `>= 20.x` (Node 22.x LTS recommended) & `npm`
- **uv** (optional, recommended for Python dependency management): `pip install uv`

---

## 3. Getting Started

### Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Using uv (fastest)
   uv venv .venv
   .\.venv\Scripts\activate   # On Windows
   # source .venv/bin/activate # On Linux/macOS

   # Or using standard python
   python -m venv .venv
   .\.venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   # Using uv
   uv pip install -r requirements.txt

   # Or using pip
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Update DATABASE_URL, SYNC_DATABASE_URL, and JWT_SECRET_KEY with real values.
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

6. Run the test suite:
   ```bash
   pytest
   ```

---

### Frontend Setup (Next.js 15)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   - **Frontend Application**: [http://localhost:3000](http://localhost:3000)

5. Check code quality & build:
   ```bash
   npm run lint
   npm run build
   ```

---

## 4. Database Migrations (Alembic)

Alembic is configured with async SQLAlchemy support. Once your live Neon PostgreSQL connection string is configured in `backend/.env`:

```bash
cd backend

# Create a new migration revision after changing SQLAlchemy models
alembic revision --autogenerate -m "describe_change"

# Apply migrations to the database
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

The committed `20261026_initial` revision creates the Phase 1 schema from the
registered SQLAlchemy metadata. Do not run `upgrade` until `backend/.env`
contains a valid Neon URL; the repository intentionally contains no database
credentials. The current environment reports `database_is_configured=False`,
so no real Neon connection or migration application was claimed.

### Authentication foundation

The backend exposes `POST /api/v1/auth/login` with a JSON body containing
`email` and `password`, and `GET /api/v1/auth/me` as the first protected-route
example. Passwords use Argon2 through `pwdlib`; access tokens use signed,
expiring JWTs. Generate a production secret with a password generator and keep
it in `backend/.env`.

Company settings use an idempotent `PUT /api/v1/settings/company`: the first
call creates the authenticated owner's settings row with safe empty defaults,
and later calls update it. Phase 2 API services record invoice payments under
row locking.

---

## 5. Security & Isolation

- All sensitive keys, secrets, and database credentials are kept in `.env` files, which are strictly ignored by Git via root, backend, and frontend `.gitignore` rules.
- `.env.example` templates contain only placeholders.
