# HEXNS CRM Project Overview

## 1. What this project is

HEXNS CRM is a billing and customer-relationship-management application for HEXNS
Mediaworks. It covers the operational flow from service catalog and client
management through quotations, invoices, payments, expenses, retainers, reports,
and company settings.

The repository is a monorepo:

- `frontend/` is the Next.js web application.
- `backend/` is the FastAPI API, authentication layer, database models, and
  migrations.
- The root `package.json` provides convenience commands for the frontend.

The frontend and backend are now connected through the typed API client. The
backend persists CRM data in PostgreSQL and scopes CRM records to the
authenticated owner.

## 2. Technology stack

### Frontend

- Next.js 15.5 with the App Router
- React 19.1
- TypeScript 5
- CSS Modules and global CSS
- `lucide-react` icons
- `jspdf` and `jspdf-autotable` for PDF documents
- `xlsx` for spreadsheet export

### Backend

- Python 3.12 or newer
- FastAPI and Uvicorn
- Pydantic Settings
- SQLAlchemy 2 async ORM
- PostgreSQL through `asyncpg`
- Alembic migrations
- Argon2 password hashing through `pwdlib`
- JWT access tokens through `PyJWT`
- Pytest, pytest-asyncio, and HTTPX

### Database

PostgreSQL is the supported database. The configuration is compatible with Neon
PostgreSQL and uses separate async and synchronous URLs:

- `DATABASE_URL` is used by the application.
- `SYNC_DATABASE_URL` is used by Alembic.

## 3. Repository layout

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
│   ├── alembic/                  # Migration environment and revisions
│   ├── tests/                    # API, security, metadata, and finance tests
│   ├── .env.example
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── seed_services.py
│   ├── seed_user.py
│   └── verify_e2e.py
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

## 4. Product areas

The frontend routes are:

| Area | Route | Purpose |
|---|---|---|
| Dashboard | `/` | Business summary and navigation |
| Clients | `/clients` | Client profiles and account information |
| Services | `/services` | Service catalogue and price tiers |
| Packages | `/packages` | Bundled services and package pricing |
| Quotations | `/quotations` | List, create, view, export, and convert quotations |
| Invoices | `/invoices` | List, create, view, export, and manage invoices |
| Payments | `/payments` | Record and track invoice payments |
| Expenses | `/expenses` | Record expenses and reimbursement claims |
| Retainers | `/retainers` | Recurring client engagements and billing |
| Reports | `/reports` | Financial and operational summaries |
| Settings | `/settings` | Company, tax, document, and bank defaults |
| Login | `/login` | JWT-backed authentication |

The frontend uses `AuthContext` for session restoration and route protection and
`CrmContext` for loading and mutating all CRM resources. `src/lib/adapters.ts`
converts API snake_case payloads to the frontend camelCase domain types.

## 5. Backend API

All versioned endpoints use the `/api/v1` prefix. CRM endpoints require a
Bearer access token.

### Public and authentication endpoints

- `GET /`, `GET /health`, `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Protected resources

The CRM router provides paginated list endpoints with `page`, `page_size`,
`search`, and resource-specific `status` filters where applicable. Each
resource also has detail, create, update, and archive/delete operations:

- `/clients`
- `/services`
- `/packages`
- `/quotations`
- `/invoices`
- `/payments`
- `/expenses`
- `/retainers`
- `/settings/company` (`GET` and idempotent `PUT`)

Additional workflow endpoints include:

- `POST /api/v1/quotations/{id}/convert` to create an invoice from a quotation.

Interactive OpenAPI documentation is available at
`http://localhost:8000/docs` while the backend is running.

## 6. Domain and business rules

The database schema currently contains:

- Users
- Clients
- Services
- Packages and package items
- Quotations and quotation line items
- Invoices and invoice line items
- Payments
- Expenses
- Retainers
- Company settings

Important behavior:

- CRM records carry an `owner_id`; queries and mutations only operate on records
  owned by the authenticated user.
- Passwords are stored as Argon2 hashes, never as plaintext.
- Access tokens are signed JWTs with an expiration time.
- Service prices must satisfy `min_price <= default_price <= max_price`.
- Monetary values use `Decimal` and are rounded to two decimal places using
  half-up rounding.
- Line-level discounts and document-level discounts are validated and allocated
  across taxable line amounts.
- Intra-state tax is split into CGST and SGST; inter-state tax is recorded as
  IGST.
- Payment recording updates invoice payment totals while protecting the update
  with row locking.
- Delete-style endpoints archive or deactivate records where appropriate rather
  than necessarily removing business history.

## 7. Local development setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm
- A PostgreSQL database for backend integration

### 7.1 Configure the backend

From the repository root in PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set:

```dotenv
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST/DATABASE?ssl=require
SYNC_DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET_KEY=use-a-long-random-secret
```

Keep real credentials and secrets only in ignored `.env` files. For staging or
production, use a JWT secret of at least 32 characters and do not use the
development default.

### 7.2 Apply migrations and seed development data

With the backend virtual environment active:

```powershell
alembic upgrade head
python seed_user.py
python seed_services.py
```

`seed_user.py` accepts optional positional arguments for email, password, and
full name. Use a development-only account and password; never use seed
credentials in production.

### 7.3 Start the backend

```powershell
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`. Check
`http://localhost:8000/api/v1/health` and open
`http://localhost:8000/docs` to verify it is running.

### 7.4 Configure and start the frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

The frontend uses `NEXT_PUBLIC_API_URL` from `frontend/.env.local`. The default
value is:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Open `http://localhost:3000`.

From the repository root, equivalent convenience commands are:

```powershell
npm install --prefix frontend
npm run dev
npm run lint
npm run build
```

## 8. Database migrations

Run Alembic commands from `backend/` with the virtual environment active:

```powershell
alembic current
alembic upgrade head
alembic downgrade -1
alembic revision --autogenerate -m "describe_change"
```

Review autogenerated migrations before applying them. The committed revisions
are:

- `20261026_initial_crm_schema.py`
- `20261026_add_owner_scope.py`

Do not run migrations until `SYNC_DATABASE_URL` points to the intended database.

## 9. Testing and quality checks

Backend tests:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

Frontend checks:

```powershell
cd frontend
npm run lint
npm run build
```

The tests cover health responses, authentication, password hashing, expired
tokens, metadata registration, owner-scoped endpoint protection, GST/tax
calculation, discount validation, and money rounding.

For an end-to-end smoke check against a configured database and running API,
review and run `backend/verify_e2e.py` according to its required environment.

## 10. Configuration reference

### Backend (`backend/.env`)

- `PROJECT_NAME`, `VERSION`
- `ENVIRONMENT`, `DEBUG`
- `CORS_ORIGINS`
- `DATABASE_URL`, `SYNC_DATABASE_URL`
- `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW`,
  `DATABASE_POOL_PRE_PING`, `DATABASE_ECHO`
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`: FastAPI URL including `/api/v1`

The backend settings load `.env` relative to the process working directory, so
start the backend commands from `backend/`.

## 11. Security and operational notes

- Never commit `.env`, `.env.local`, database URLs, JWT secrets, or real user
  credentials.
- Restrict `CORS_ORIGINS` to the actual frontend origins outside local
  development.
- Replace development secrets before staging or production deployment.
- Use HTTPS for deployed frontend/API traffic.
- Review generated migrations and back up the database before production
  migrations.
- The frontend stores the access token in memory with a local-storage fallback;
  treat browser access and XSS prevention as security-sensitive.

## 12. Current limitations and next steps

- Deployment, background jobs, file/object storage, email delivery, and
  observability are not defined in this repository.
- Reports and dashboard aggregation are primarily frontend concerns today.
- The frontend still contains seed catalogue/settings data as fallback behavior;
  verify the database-backed path when integrating a new environment.
- Add role/permission policies beyond the current authenticated-owner boundary
  before introducing multiple staff roles.
- Add CI, production deployment configuration, database backups, and broader
  end-to-end coverage before release.

## 13. Useful source locations

- Backend application factory: `backend/app/main.py`
- API registration: `backend/app/api.py`
- Runtime settings: `backend/app/core/config.py`
- Database session setup: `backend/app/core/database.py`
- SQLAlchemy entities: `backend/app/models/`
- Authentication: `backend/app/modules/auth/`
- CRM routes and workflows: `backend/app/modules/crm/router.py`
- Financial calculations: `backend/app/modules/crm/finance.py`
- Frontend API client: `frontend/src/lib/api.ts`
- Frontend state and API orchestration: `frontend/src/context/CrmContext.tsx`
- Frontend authentication: `frontend/src/context/AuthContext.tsx`
- Frontend/backend payload adapters: `frontend/src/lib/adapters.ts`
