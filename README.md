# Skill Hub

Skill Hub is an internal company tool for discovering, submitting, reviewing, and publishing AI
agent skills. It is not a public marketplace: everyone signs in before browsing the catalog.

The current v1 product contract has two persisted roles:

- **Members** are employees. Each member belongs to one department, browses published skills
  available to that department, copies install commands, and submits new skills for review.
- **Admins** curate the catalog. They review submissions, publish or reject skills, feature trusted
  entries, manage departments and members, and decide whether each published skill is org-wide or
  department-scoped.

Skills move through `draft -> pending -> published / rejected / unpublished`, with an append-only
review history and idempotent mutating actions so double-clicks and retries do not create duplicate
state changes.

## Source of Truth

The v1 product, data, API, and implementation contract lives under `docs/`:

| Document | What it defines |
| --- | --- |
| [`docs/spec.md`](docs/spec.md) | Product spec: users, flows, states, permission boundaries, acceptance criteria |
| [`docs/schema.md`](docs/schema.md) | PostgreSQL data model: entities, constraints, indexes, cascade rules |
| [`docs/api.md`](docs/api.md) | HTTP API: endpoints, auth, error codes, pagination |
| [`docs/implement.md`](docs/implement.md) | How the three tiers should be built and wired together |
| [`docs/discovery.md`](docs/discovery.md) | Archived public-platform research; use only the internal v1 takeaways |

## Implementation Status

The repository already contains a FastAPI backend, a Next.js frontend, Alembic migrations, seed data,
and tests. The latest docs above are the intended v1 contract.

The current app code has been migrated to the documented `member / admin` model. The backend includes
departments, department-scoped skill visibility, lifecycle enforcement, admin member management, and
pytest coverage for the core permission matrix. The frontend removes the demo role switcher and uses
the authenticated account role for member/admin navigation.

Remaining hardening work: `Idempotency-Key` now detects same-user fingerprint conflicts and replays
the affected resource, but the stored `response_status` / `response_body` fields are not yet used for
byte-for-byte response replay.

## Stack

- **Frontend**: Next.js App Router, React, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod
- **Backend**: FastAPI, SQLAlchemy 2.0 async, Pydantic v2, JWT, argon2, Alembic
- **Database**: PostgreSQL 16, case-insensitive unique indexes, GIN full-text search

```
frontend/  Next.js app  ->  backend/  FastAPI  ->  PostgreSQL
```

## Run It

Docker Compose lives in `docker/docker-compose.yml`. From the repository root:

```bash
docker compose -f docker/docker-compose.yml --project-directory . up
```

- App: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>

The seed script creates default departments, a first admin, and member accounts for local testing:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@skillhub.example` | `admin12345` |
| Member | `mina@example.com` | `creator123` |
| Member | `product@example.com` | `member12345` |

Normal employees can also register as members with a required department from the public department
list.

## Manual Development

**1. Database**

```bash
docker run -d --name skillhub-db -e POSTGRES_USER=skill -e POSTGRES_PASSWORD=skill ^
  -e POSTGRES_DB=skillhub -p 5432:5432 postgres:16-alpine
```

**2. Backend**

```bash
cd backend
uv venv
uv pip install -e ".[dev]"
$env:DATABASE_URL = "postgresql+asyncpg://skill:skill@localhost:5432/skillhub"
$env:JWT_SECRET = "dev-secret-key-at-least-32-bytes-long"
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --port 8000
```

**3. Frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000/api/v1`; override with
`NEXT_PUBLIC_API_BASE_URL` when needed.

## Tests

```bash
cd backend
uv run pytest
```

For a PostgreSQL-backed test run:

```bash
cd backend
$env:TEST_DATABASE_URL = "postgresql+asyncpg://skill:skill@localhost:5432/skillhub_test"
uv run pytest
```

The intended v1 test surface is the acceptance criteria in `docs/spec.md` and the permission matrix
in `docs/api.md`: auth, department-scoped visibility, submission validation, lifecycle actions,
admin-only curation, and idempotency.

## Current Code Notes

These notes describe the implementation details that intentionally differ from the PostgreSQL-only
schema text for local test portability:

- UUIDs are currently stored as `String(36)` with app-generated UUID v4 values so the same models run
  on both PostgreSQL and the SQLite test database.
- Enums currently use `native_enum=False` for the same test portability reason.
- The frontend currently fetches with TanStack Query on the client.

## Project Layout

```
backend/
  app/
    core/          config, security, errors, pagination, responses
    db/            async engine and session
    models/        SQLAlchemy models
    schemas/       Pydantic request/response models
    deps/          auth tiers and idempotency
    repositories/  data access and visibility filtering
    services/      business logic
    routers/       API routers
    seed.py        seed data
  migrations/      Alembic
  tests/           pytest suite
docker/
  docker-compose.yml
docs/
  spec.md  schema.md  api.md  implement.md  discovery.md
  prototypes/
frontend/
  src/
    app/           App Router routes
    components/    UI and workflow components
    lib/api/       typed API client
    lib/auth/      auth state helpers
    lib/validation/ form validation
```
