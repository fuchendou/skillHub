# Skill Hub

A hub for discovering, submitting, and reviewing AI agent skills — the **Review Command Center**
(direction 2). Three roles (visitor / creator / admin) drive a skill lifecycle of
`draft → pending → published / rejected / unpublished`, with admin-curated featuring.

This repository contains the full three-tier implementation described in
[`implement.md`](implement.md), built from the product/data/API specs:

| Document | What it defines |
| --- | --- |
| [`spec.md`](spec.md) | Product spec: users, flows, states, permission boundaries, acceptance criteria |
| [`schema.md`](schema.md) | PostgreSQL data model: entities, constraints, indexes, cascade rules |
| [`api.md`](api.md) | HTTP API: endpoints, auth, error codes, pagination |
| [`implement.md`](implement.md) | How the three tiers are built and wired together |

## Stack

- **Frontend** — Next.js (App Router) · React · TypeScript · Tailwind CSS · TanStack Query · React Hook Form + Zod
- **Backend** — FastAPI · SQLAlchemy 2.0 (async) · Pydantic v2 · JWT + argon2 · Alembic
- **Database** — PostgreSQL 16 (citext-style `lower()` unique indexes, GIN full-text search)

```
frontend/  Next.js app  → talks to →  backend/  FastAPI  → asyncpg →  PostgreSQL
```

## Run it (Docker — one command)

```bash
docker compose up
```

- App: <http://localhost:3000>
- API + interactive docs: <http://localhost:8000/docs>

The backend container migrates and seeds the database on startup. Seed accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@skillhub.example` | `admin12345` |
| Creator | `mina@example.com` | `creator123` |

In the app, use the **Demo as** switch in the sidebar (Visitor / Creator / Admin) to sign in as the
seeded accounts instantly, or **Sign in manually** at `/login`.

## Run it (manual / development)

**1. Database**

```bash
docker run -d --name skillhub-db -e POSTGRES_USER=skill -e POSTGRES_PASSWORD=skill \
  -e POSTGRES_DB=skillhub -p 5432:5432 postgres:16-alpine
```

**2. Backend** (`backend/`)

```bash
cd backend
uv venv && uv pip install -e ".[dev]"
export DATABASE_URL="postgresql+asyncpg://skill:skill@localhost:5432/skillhub"
export JWT_SECRET="dev-secret-key-at-least-32-bytes-long"
uv run alembic upgrade head      # create schema
uv run python -m app.seed        # seed categories, tags, users, demo skills
uv run uvicorn app.main:app --reload --port 8000
```

**3. Frontend** (`frontend/`)

```bash
cd frontend
npm install
npm run dev                       # http://localhost:3000
```

The frontend defaults to `http://localhost:8000/api/v1`; override with `NEXT_PUBLIC_API_BASE_URL`.

## Tests

```bash
cd backend
uv run pytest                                   # fast: runs against a throwaway sqlite db
TEST_DATABASE_URL="postgresql+asyncpg://skill:skill@localhost:5432/skillhub_test" uv run pytest
```

The suite covers the auth flow, submission + validation, visibility (the 404-not-403 rule), the full
lifecycle state machine, the permission matrix, and idempotency (double-click + replayed
`Idempotency-Key`). Pointing `TEST_DATABASE_URL` at Postgres additionally exercises full-text search.

## Project layout

```
backend/
  app/
    core/          config, security (JWT/argon2), errors, pagination, responses
    db/            async engine + session
    models/        SQLAlchemy models (one per schema.md entity)
    schemas/       Pydantic request/response models (the api.md shapes)
    deps/          auth tiers (visitor/creator/admin) + idempotency
    repositories/  data access (visibility, filtered listing, search)
    services/      business logic (lifecycle state machine, validation, idempotency)
    routers/       one router per api.md section
    seed.py        idempotent seed data
  migrations/      Alembic (initial migration + GIN search index)
  tests/           pytest suite
frontend/
  src/
    app/           App Router routes (catalog, skill detail, submit, my-skills, review, login)
    components/     Sidebar, SkillCard, SkillActions, CatalogFilters, RoleGate, Toaster, …
    lib/api/       typed client mirroring api.md
    lib/auth/       token store + AuthProvider (role switcher)
    lib/validation/ zod schemas mirroring schema.md
docker-compose.yml
```

## Notes & deviations

- **UUIDs** are stored as `String(36)` (app-generated) rather than a native `uuid` column, so the same
  models run on both Postgres and the sqlite test database. The IDs are still server-generated UUID v4.
- **Enums** use `native_enum=False` (VARCHAR + CHECK) for the same portability reason.
- The frontend fetches uniformly via TanStack Query on the client (rather than mixing in Server
  Components) to keep the catalog fully interactive — a pragmatic simplification of implement.md §5.2.
- The sidebar role switcher performs a **real** login against the seeded accounts; it is a demo
  convenience over genuine JWT auth, not a client-side role spoof. The API enforces every boundary.
