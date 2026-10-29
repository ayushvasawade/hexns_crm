# HEXNS CRM Project Overview

## 1. Project summary

HEXNS CRM is a billing, quotation, invoicing, and financial-management application for HEXNS Mediaworks. The repository is a monorepo containing:

- A Next.js frontend for the CRM workspace.
- A FastAPI backend intended to provide the production API.
- SQLAlchemy and Alembic infrastructure for asynchronous PostgreSQL access and schema migrations.

The project is currently in an early implementation phase. The frontend has a broad working UI surface, while the backend is still primarily an application and database foundation with health endpoints.

## 2. Technology stack

### Frontend

- Next.js 15 with the App Router
- React 19
- TypeScript
- CSS Modules and shared global styles
- `lucide-react` for icons
- `jspdf` and `xlsx` for document and spreadsheet exports

### Backend

- FastAPI
- Pydantic Settings
- SQLAlchemy 2 with async sessions
- `asyncpg` for PostgreSQL connectivity
- Alembic for migrations
- Pytest, pytest-asyncio, and HTTPX for testing

### Planned infrastructure

- PostgreSQL-compatible database, configured for Neon
- Local development frontend on port 3000
- Local development API on port 8000

## 3. Repository structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py         # Environment and application settings
│   │   │   ├── database.py       # Async SQLAlchemy engine and sessions
│   │   │   ├── exceptions.py     # API exception definitions and handlers
│   │   │   └── logging.py        # Application logging configuration
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── crm.py            # Relational database models for CRM
│   │   │   └── user.py           # User authentication and credentials model
│   │   ├── modules/
│   │   │   ├── __init__.py
│   │   │   ├── auth/             # Authentication & session router
│   │   │   └── crm/              # Unified CRM domain router & schemas
│   │   ├── __init__.py
│   │   ├── api.py                # Versioned API router and health endpoint
│   │   └── main.py               # FastAPI application factory
│   ├── alembic/
│   │   ├── README                # Alembic directory notes
│   │   ├── env.py                # Async migration environment
│   │   └── script.py.mako        # Migration file template
│   ├── tests/
│   │   └── test_health.py        # Root and versioned health endpoint tests
│   ├── .env.example              # Backend configuration template
│   ├── .gitignore
│   ├── alembic.ini               # Alembic configuration
│   ├── pytest.ini                # Pytest configuration
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── public/
│   │   └── hexns_logo.svg
│   ├── src/
│   │   ├── app/
│   │   │   ├── clients/page.tsx
│   │   │   ├── expenses/page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── packages/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── quotations/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── retainers/page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.module.css
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.module.css
│   │   │   │   └── AppShell.tsx
│   │   │   └── ui/
│   │   │       ├── Badge.tsx
│   │   │       └── Modal.tsx
│   │   ├── context/CrmContext.tsx
│   │   ├── data/seedData.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── exportUtils.ts
│   │   │   ├── financialCalculations.ts
│   │   │   └── formatters.ts
│   │   └── types/
│   │       ├── crm.ts
│   │       └── index.ts
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── package.json                  # Root development scripts
├── README.md                     # Setup guide
└── Overview.md                   # This document
```

## 4. Product surface

The frontend currently includes routes for:

- Dashboard
- Clients
- Expenses
- Invoices, including create and detail views
- Payments
- Quotations, including create and detail views
- Reports
- Retainers
- Services
- Packages
- Settings

Shared frontend functionality includes:

- Application shell and navigation
- Reusable badges and modal components
- CRM context/state management
- Financial calculations and formatting helpers
- PDF and spreadsheet export helpers
- A base API client using `NEXT_PUBLIC_API_URL`

At present, the frontend includes seed data and client-side behavior. The API client is prepared for backend integration, but the domain routes are not yet connected to backend endpoints.

## 5. Backend status

### Available now

- FastAPI application factory and lifespan logging
- CORS configuration for local frontend origins
- Root endpoint: `GET /`
- Health endpoints:
  - `GET /health`
  - `GET /api/v1/health`
- Centralized handlers for application exceptions, validation errors, and unexpected errors
- Pydantic-based environment configuration
- Async SQLAlchemy engine and request-scoped database sessions
- Alembic environment configured for asynchronous migrations
- Initial health endpoint tests

### Implemented & Active

- Authentication module with JWT tokens and Argon2 password hashing
- Unified CRM domain module (backend/app/modules/crm/) and SQLAlchemy models (backend/app/models/crm.py)
- Alembic database migration revisions
- Endpoints for Clients, Services, Packages, Quotations, Invoices, Payments, Expenses, Retainers, and Reports
- Automated test suite covering foundation, health, and business logic.

## 6. Running the project locally

### Prerequisites

- Python 3.12 or newer
- Node.js 20 or newer
- npm
- PostgreSQL or a Neon PostgreSQL database for backend persistence

### Frontend

From the repository root:

```bash
npm install --prefix frontend
npm run dev
```

The frontend starts at `http://localhost:3000`.

### Backend

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API starts at `http://localhost:8000`. Interactive documentation is available at `/docs`.

Update `backend/.env` with a real `DATABASE_URL` before using database-backed functionality or migrations.

### Tests and quality checks

From the repository root:

```powershell
python -m pytest backend\tests -q
npm run lint
npm run build
```

The backend test dependencies must be installed in the active Python environment before running the tests.

## 7. Configuration

The backend reads settings from `backend/.env`, including:

- `ENVIRONMENT`
- `DEBUG`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `SYNC_DATABASE_URL`
- Database pool settings

The frontend API base URL is controlled by:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Secrets and real database credentials must remain in ignored `.env` files and must not be committed.

## 8. Development roadmap

The recommended implementation order is:

1. Define the core SQLAlchemy models and the initial Alembic migration.
2. Add authentication, user roles, and secure session/token handling.
3. Implement clients, services, quotations, invoices, payments, and expenses as domain modules.
4. Add dashboard aggregates and reporting endpoints.
5. Replace frontend seed data with API-backed queries and mutations.
6. Add request, authorization, database, and end-to-end test coverage.
7. Add production configuration, observability, deployment automation, and backup procedures.

## 9. Current project assessment

The repository is a strong structural starting point for a modular CRM, with the primary user-facing navigation and frontend workflow areas already laid out. The main delivery gap is backend implementation: business data models, persistence, authentication, and API contracts must be built before the application can operate as a connected production system.
