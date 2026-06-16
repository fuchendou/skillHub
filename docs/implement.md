# Skill Hub — Implementation Guide (`implement.md`)

How to build the Skill Hub v1 as a real three-tier application. This document turns the
product spec ([`spec.md`](spec.md)), the data model ([`schema.md`](schema.md)), and the HTTP
contract ([`api.md`](api.md)) into a concrete stack:

| Tier | Technology | Role |
| --- | --- | --- |
| **Frontend** | Next.js (App Router, React, TypeScript) | The "Review Command Center" UI — login/registration, the department-scoped member catalog, member submission, admin review queue |
| **Backend** | FastAPI (Python, async) | Implements every endpoint in `api.md`; enforces auth, visibility, and lifecycle rules |
| **Database** | PostgreSQL | Persists every entity in `schema.md`; owns uniqueness, indexes, and cascade rules |

Entity names (`user`, `skill`, `review_action`, …), endpoint paths (`POST /skill/{id}/publish`),
business error codes (`DUPLICATE_SKILL_NAME`), and lifecycle states (`draft → pending → published`)
are used here **verbatim** from the three source documents. When this guide and a source document
disagree, the source document wins.

---

## 1. Architecture at a Glance

```
┌─────────────────────┐      HTTPS / JSON        ┌──────────────────────┐      asyncpg       ┌──────────────┐
│   Next.js frontend  │  ───────────────────────▶│    FastAPI backend   │ ─────────────────▶ │  PostgreSQL  │
│  (App Router, RSC)  │   Bearer <access_token>  │  routers → services  │  SQLAlchemy 2.0    │   (16+)      │
│                     │◀───────────────────────  │  → repositories      │◀───────────────────│              │
│  login/register,    │   { data } / { error }   │                      │   Alembic migrate  │  citext,     │
│  forms, queue       │                          │  JWT, RBAC, FTS      │                    │  GIN FTS     │
└─────────────────────┘                          └──────────────────────┘                    └──────────────┘
```

- **Stateless backend.** FastAPI authenticates every protected request from `Authorization:
  Bearer <access_token>` (`api.md` §3). It does not keep application sessions; refresh-token rotation
  and idempotency replay are the only server-side auth/retry records.
- **Database owns invariants.** Uniqueness (`skill_name_uniq`, `skill_source_uniq`), referential
  integrity (`RESTRICT`/`CASCADE`/`SET NULL`), and indexes from `schema.md` live in the DB so that
  two concurrent submits can never both win a duplicate-name race.
- **API owns visibility.** The department-scoped visibility rule — a member sees only `published`
  skills available to their department (org-wide or assigned) plus their own submissions, and every
  request must be authenticated (`schema.md` visibility rule) — is enforced in the service layer on
  **every** read, never trusted to the client.
- **Frontend owns presentation only.** The login-derived account state and "hide admin actions for
  non-admins" behavior (`spec.md` §5) are UX affordances; they are *also* enforced server-side, so a
  forged request still gets `403`.

### Request lifecycle (publish, as an example)

1. Admin clicks **Publish** in the queue → a Next.js route handler sends `POST /skill/{id}/publish`
   to FastAPI with `Authorization` and an `Idempotency-Key` header.
2. FastAPI dependency decodes the JWT, loads the `user`, asserts `role == admin` (else `403 FORBIDDEN_ROLE`).
3. The lifecycle service loads the skill, checks the transition is legal (`schema.md` allowed
   transitions), flips `status`, sets `published_at` if first time, and appends one `review_action`.
4. If the `Idempotency-Key` was seen before, the original result is replayed — no second `review_action`.
5. Response `{ "data": { ...skill } }` returns `200`; the frontend invalidates its catalog/query cache.

---

## 2. Repository Layout

A single repo with two deployable apps and shared infra config:

```
skillHub/
├── spec.md  schema.md  api.md  implement.md   # the source-of-truth docs
├── docker-compose.yml                         # postgres + backend + frontend for local dev
├── .env.example                               # every env var, documented
│
├── backend/
│   ├── pyproject.toml                         # deps managed with uv / poetry
│   ├── alembic.ini
│   ├── migrations/                            # Alembic versions
│   └── app/
│       ├── main.py                            # FastAPI app factory, router mounting, exception handlers
│       ├── core/
│       │   ├── config.py                      # pydantic-settings (env-driven)
│       │   ├── security.py                    # JWT encode/decode, argon2 hashing
│       │   ├── errors.py                      # AppError + the api.md error-code table
│       │   └── pagination.py                  # page/limit parsing + envelope helper
│       ├── db/
│       │   ├── base.py                        # async engine + session factory
│       │   └── session.py                     # get_session() dependency
│       ├── models/                            # SQLAlchemy ORM — one file per schema.md entity
│       │   ├── user.py  skill.py  category.py  tag.py  skill_tag.py  review_action.py
│       │   ├── refresh_token.py  idempotency_key.py
│       ├── schemas/                           # Pydantic request/response models (the api.md shapes)
│       │   ├── auth.py  skill.py  category.py  tag.py  user.py  common.py
│       ├── deps/
│       │   ├── auth.py                        # get_current_user, require_role, optional_user
│       │   └── idempotency.py                 # Idempotency-Key handling
│       ├── services/                          # business logic (visibility, lifecycle, validation)
│       │   ├── skill_service.py  review_service.py  auth_service.py
│       ├── repositories/                      # data access (queries, filters)
│       │   └── skill_repository.py  ...
│       └── routers/                           # one router per api.md §9 section
│           ├── auth.py  skill.py  skill_lifecycle.py  category.py  tag.py  user.py
│
└── frontend/
    ├── package.json
    ├── next.config.ts  tailwind.config.ts  tsconfig.json
    └── src/
        ├── app/                               # App Router routes (see §5.2)
        ├── components/                        # SkillCard, ReviewQueue, RoleGate, ...
        ├── lib/
        │   ├── api/                           # typed fetch client mirroring api.md
        │   ├── auth/                          # token store, refresh, useAuth()
        │   └── validation/                    # zod schemas mirroring schema.md constraints
        └── types/                             # TS types generated from the API
```

**Why layered backend?** Routers stay thin (parse → call service → serialize). Services hold the
rules from `spec.md`/`schema.md` (visibility, transitions, idempotency) and are unit-testable
without HTTP. Repositories isolate SQLAlchemy so query changes never touch business logic.

---

## 3. Backend — FastAPI

### 3.1 Stack & key dependencies

| Concern | Library | Notes |
| --- | --- | --- |
| Framework | `fastapi` | ASGI, async endpoints |
| Server | `uvicorn[standard]` | dev + prod (behind gunicorn workers in prod) |
| ORM | `sqlalchemy[asyncio]` 2.0 | async ORM, typed `Mapped[...]` columns |
| Driver | `asyncpg` | async PostgreSQL driver |
| Migrations | `alembic` | schema versioning (§4.2) |
| Validation | `pydantic` v2 + `pydantic-settings` | request/response models, env config |
| Auth | `pyjwt`, `argon2-cffi` | JWT encode/decode; argon2 password hashing (`schema.md` `password_hash`) |
| Testing | `pytest`, `pytest-asyncio`, `httpx` | async API tests against a throwaway DB |

### 3.2 SQLAlchemy models (mapping `schema.md`)

One model per entity, field-for-field with `schema.md`. Example for the core `skill` table — note
the enum, the `server_default`s, and the case-insensitive uniqueness handled at the DB level (§4.3):

```python
# app/models/skill.py
import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class SkillStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    published = "published"
    rejected = "rejected"
    unpublished = "unpublished"

class Skill(Base):
    __tablename__ = "skill"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(120), nullable=False)        # uniqueness via citext index, §4.3
    slug: Mapped[str] = mapped_column(String(140), nullable=False, unique=True)
    summary: Mapped[str] = mapped_column(String(280), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"), nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("category.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[SkillStatus] = mapped_column(Enum(SkillStatus, name="skill_status"),
                                                nullable=False, server_default=SkillStatus.draft.value)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    install_command: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)  # uniqueness via citext index
    usage_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_label: Mapped[str | None] = mapped_column(String(40), server_default="Low risk")
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User")
    category = relationship("Category")
    tags = relationship("Tag", secondary="skill_tag", lazy="selectin")
    departments = relationship("Department", secondary="skill_department", lazy="selectin")
```

The remaining domain tables (`user`, `department`, `category`, `tag`, `skill_tag`, `skill_department`,
`review_action`) follow the same pattern. The `review_action` model is **append-only** — no
`updated_at`, and never `UPDATE`d — and uses `ondelete="SET NULL"` on `actor_id` so the audit trail
survives a removed user (`schema.md` cascade rules).

The internal-tool model adds a `department` table, a `user.department_id` FK, and a `skill_department`
join that scopes a published skill's visibility:

```python
# app/models/department.py
class Department(Base):
    __tablename__ = "department"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(60), nullable=False)   # unique via lower(name) index, §4.3
    slug: Mapped[str] = mapped_column(String(70), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

# app/models/skill_department.py  — composite-PK join (org-wide == no rows for the skill)
class SkillDepartment(Base):
    __tablename__ = "skill_department"
    skill_id: Mapped[str] = mapped_column(ForeignKey("skill.id", ondelete="CASCADE"), primary_key=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("department.id", ondelete="RESTRICT"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

# app/models/user.py  — the new column on the existing User model (required for members, NULL for admins)
#   role:          Mapped[str]        = mapped_column(Enum(..., name="user_role"), server_default="member")
#   department_id: Mapped[str | None] = mapped_column(ForeignKey("department.id", ondelete="RESTRICT"), nullable=True)
```

Two support tables close the API contracts that are not pure catalog data:

- `refresh_token` stores only a hash of the opaque token returned by login/refresh; refresh rotates by
  revoking the old row and inserting a new one.
- `idempotency_key` stores `(user_id, key)`, a request fingerprint, response status/body, and expiry so
  retries can replay the original result without creating duplicate `review_action` rows.

### 3.3 Pydantic schemas (the `api.md` envelopes)

Requests validate inbound bodies against `schema.md` constraints; responses produce the exact JSON
shapes in `api.md` §5/§9. Keep request, response, and "embedded" variants separate.

```python
# app/schemas/skill.py
from pydantic import BaseModel, Field, field_validator
import re

INSTALL_RE = re.compile(r"^(codex|claude|gemini|opencode)\s+skill\s+(install|add)\s+[A-Za-z0-9._/-]+$")

class SkillCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=10, max_length=280)
    category_id: str
    install_command: str = Field(max_length=255)
    source_url: str = Field(max_length=500)
    tags: list[str] = []
    usage_note: str | None = Field(default=None, max_length=5000)
    draft: bool = False

    @field_validator("install_command")
    @classmethod
    def _check_install(cls, v: str) -> str:
        if not INSTALL_RE.match(v):
            # raised as VALIDATION_ERROR detail OR mapped to INVALID_INSTALL_COMMAND in the service
            raise ValueError("Install command format is not valid.")
        return v

class SkillOut(BaseModel):
    id: str
    name: str
    slug: str
    summary: str
    status: str
    is_featured: bool
    install_command: str
    source_url: str
    usage_note: str | None
    risk_label: str | None
    rejection_reason: str | None
    category: "CategoryRef"
    owner: "UserRef"
    tags: list["TagRef"]
    published_at: str | None
    created_at: str
    updated_at: str
    model_config = {"from_attributes": True, "populate_by_name": True}
```

A generic envelope wraps every response so the `{ "data": ... }` / `{ "data": [...], "pagination": ... }`
contract (`api.md` §5) is produced in exactly one place:

```python
# app/schemas/common.py
from typing import Generic, TypeVar
from pydantic import BaseModel
T = TypeVar("T")

class Envelope(BaseModel, Generic[T]):
    data: T

class Page(BaseModel):
    total: int; page: int; limit: int; totalPages: int

class PagedEnvelope(BaseModel, Generic[T]):
    data: list[T]
    pagination: Page
```

### 3.4 Configuration

All deployment-specific values come from the environment via `pydantic-settings`, never hardcoded:

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str                      # postgresql+asyncpg://user:pass@host:5432/skillhub
    jwt_secret: str                        # HS256 signing key (rotate-able)
    access_token_ttl_seconds: int = 900    # 15 min  (api.md §3)
    refresh_token_ttl_seconds: int = 2592000  # 30 days
    cors_origins: list[str] = ["http://localhost:3000"]
    class Config: env_file = ".env"

settings = Settings()
```

### 3.5 Database session & engine

```python
# app/db/base.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.database_url, pool_size=10, max_overflow=20, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase): ...

# app/db/session.py
async def get_session():
    async with SessionLocal() as session:
        yield session
```

### 3.6 Authentication & authorization

JWT issuing/verification, opaque refresh-token hashing, and argon2 password hashing (`api.md` §3,
`schema.md` `password_hash` / `refresh_token`):

```python
# app/core/security.py
import jwt
from datetime import datetime, timedelta, timezone
from argon2 import PasswordHasher
from app.core.config import settings

ph = PasswordHasher()

def hash_password(raw: str) -> str: return ph.hash(raw)
def verify_password(raw: str, digest: str) -> bool:
    try: return ph.verify(digest, raw)
    except Exception: return False

def make_access_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "role": role, "exp": now + timedelta(seconds=settings.access_token_ttl_seconds)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
```

Access tokens are JWTs; refresh tokens are high-entropy opaque strings. Store only a hash of each
refresh token, reject expired/revoked rows, and rotate on every `POST /auth/refresh` by revoking the
used row and inserting a new one.

Role enforcement is expressed as **FastAPI dependencies** so every endpoint declares its tier
inline, matching the **Auth** column in `api.md` §9:

```python
# app/deps/auth.py
from fastapi import Depends, Header
from app.core.errors import AppError

async def optional_user(authorization: str | None = Header(default=None), session=Depends(get_session)):
    """Public-route helper: returns None for no/invalid token — used only by the few Public routes (e.g. GET /department). All catalog reads use get_current_user (auth required)."""
    if not authorization: return None
    ...  # decode; on bad token return None so the few Public routes still work

async def get_current_user(authorization: str | None = Header(default=None), session=Depends(get_session)):
    """member/admin tier: missing/expired token -> 401."""
    if not authorization: raise AppError("UNAUTHENTICATED", 401, "Missing Authorization header")
    try:
        claims = jwt.decode(authorization.removeprefix("Bearer ").strip(), settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise AppError("TOKEN_EXPIRED", 401, "Access token expired — refresh and retry")
    except jwt.PyJWTError:
        raise AppError("UNAUTHENTICATED", 401, "Invalid token")
    user = await session.get(User, claims["sub"])
    if user is None or not user.is_active: raise AppError("UNAUTHENTICATED", 401, "Unknown user")
    return user

def require_role(*roles: str):
    async def _dep(user=Depends(get_current_user)):
        if user.role not in roles:
            raise AppError("FORBIDDEN_ROLE", 403, "Your role cannot perform this action")
        return user
    return _dep

require_admin = require_role("admin")
```

Usage in a router mirrors `api.md` one-to-one:

```python
# app/routers/skill_lifecycle.py
@router.post("/skill/{skill_id}/publish")
async def publish(skill_id: str, user=Depends(require_admin),
                  idem=Depends(idempotency_key), session=Depends(get_session)):
    skill = await review_service.publish(session, skill_id, actor=user, idempotency_key=idem)
    return Envelope(data=SkillOut.model_validate(skill))
```

### 3.7 Visibility filtering (the core security rule)

`schema.md`'s visibility rule and `api.md` §9.2 (`status` is "visibility-gated") are enforced in the
repository, taking the caller as input. Every catalog read requires authentication, so `user` is
always present; a member passing `?status=pending` (without `owner=me`) still gets only the
department-visible published rows — the filter is re-applied server-side regardless of query:

```python
# app/repositories/skill_repository.py
from sqlalchemy import and_, or_
from app.models.department import Department

def apply_visibility(stmt, user):
    # All catalog reads require auth (api.md §3); `user` is never None here.
    if user.role == "admin":                          # admin sees everything
        return stmt
    dept_visible = and_(
        Skill.status == "published",
        or_(
            ~Skill.departments.any(),                                    # org-wide (no skill_department rows)
            Skill.departments.any(Department.id == user.department_id),  # assigned to the member's department
        ),
    )
    # member: their own submissions (any status) OR a department-visible published skill
    return stmt.where(or_(Skill.owner_id == user.id, dept_visible))
```

`GET /skill/{id}` returns `404 SKILL_NOT_FOUND` (not `403`) when a row exists but is invisible to the
caller — this avoids leaking the existence of records the caller may not see (`api.md` §9.2).

### 3.8 Lifecycle service — state machine + idempotency

The allowed-transitions table from `schema.md` lives in one place. Each accepted action mutates the
skill **and** appends exactly one `review_action` in the same transaction:

```python
# app/services/review_service.py
ALLOWED = {  # (from_status, action) -> to_status   (schema.md allowed transitions)
    ("draft", "submit"): "pending", ("draft", "resubmit"): "pending",
    ("pending", "publish"): "published", ("unpublished", "publish"): "published",
    ("pending", "reject"): "rejected",
    ("published", "unpublish"): "unpublished",
    ("rejected", "resubmit"): "pending",
}

async def publish(session, skill_id, actor, idempotency_key=None):
    if idempotency_key and (cached := await replay(session, idempotency_key)):
        return cached                                   # api.md §4 — replays return original result
    skill = await get_or_404(session, skill_id)
    if skill.status == "published":                     # idempotent no-op (api.md §8 note)
        return skill                                    # NOT a 409; no second review_action
    if ("published") != ALLOWED.get((skill.status, "publish")):
        raise AppError("INVALID_STATE_TRANSITION", 409, f"Cannot publish from {skill.status}")
    frm = skill.status
    skill.status = "published"
    if skill.published_at is None: skill.published_at = func.now()
    session.add(ReviewAction(skill_id=skill.id, actor_id=actor.id, action="publish",
                             from_status=frm, to_status="published"))
    await session.commit()
    return skill
```

`reject` additionally requires a non-empty `reason` (else `400 MISSING_REJECTION_REASON`), stores it
in `rejection_reason`, and forces `is_featured = false`. `feature`/`unfeature` only act while
`status == published`. **Idempotency** combines two safeguards: the `idempotency_key` replay table
(`schema.md`) and the "already in target state ⇒ no-op success" check — together they make
double-clicks safe (`spec.md` §5, `api.md` §4).

### 3.9 Centralized error handling

A single `AppError` carries the business code + HTTP status from `api.md` §8; one exception handler
renders the `{ "error": { code, message, details } }` envelope. Pydantic `ValidationError` is
translated into `VALIDATION_ERROR` with field-level `details`, and PostgreSQL unique-violations are
caught and mapped to `DUPLICATE_SKILL_NAME` / `DUPLICATE_SOURCE_URL` / `EMAIL_ALREADY_EXISTS` /
`RESOURCE_IN_USE`:

```python
# app/main.py
@app.exception_handler(AppError)
async def app_error_handler(_, exc: AppError):
    return JSONResponse(status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}})

@app.exception_handler(RequestValidationError)
async def validation_handler(_, exc):
    details = [{"field": e["loc"][-1], "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=400,
        content={"error": {"code": "VALIDATION_ERROR", "message": "One or more fields are invalid.", "details": details}})
```

Letting the DB raise the duplicate (rather than a pre-`SELECT`) is what closes the concurrent-submit
race — the unique index is the single source of truth.

### 3.10 Pagination

One helper parses `page`/`limit` (clamped to `1–100`, default `20`, `api.md` §7) and builds the
`pagination` object via a `COUNT(*)` + `LIMIT/OFFSET`:

```python
def paginate(page=1, limit=20):
    page = max(page, 1); limit = min(max(limit, 1), 100)
    return page, limit, (page - 1) * limit
# totalPages = ceil(total / limit)
```

### 3.11 Endpoint ↔ router map

| `api.md` section | Router file | Tier(s) |
| --- | --- | --- |
| §9.1 `/auth` (register w/ department, login, refresh, me) | `routers/auth.py` | Public / member+admin |
| §9.2 `/skill` (list, get, create, update, delete) | `routers/skill.py` | member / admin |
| §9.2 `/skill/{id}/departments` (assign visibility) | `routers/skill.py` | admin |
| §9.3 `/skill/{id}/…` lifecycle + review-action log | `routers/skill_lifecycle.py` | admin (+ owner resubmit) |
| §9.4 `/category` | `routers/category.py` | member read / admin write |
| §9.5 `/tag` | `routers/tag.py` | member read / admin write |
| §9.6 `/user` (profile, me) + §9.8 member admin | `routers/user.py` | member+admin self / admin manage |
| §9.7 `/department` | `routers/department.py` | Public list / member read / admin write |

---

## 4. Database — PostgreSQL

### 4.1 Why PostgreSQL specifically

`schema.md` leans on capabilities that map cleanly onto Postgres:

- **`citext`** for case-insensitive uniqueness on `user.email`, `skill.name`, `skill.source_url`
  (the `lower(...)` unique indexes in `schema.md`).
- **`gen_random_uuid()`** (from `pgcrypto`/`pgcrypto`-builtin) for server-side UUID v4 PKs.
- **GIN full-text index** for the keyword search behind `GET /skill?q=` (`skill_search_ft`).
- **`jsonb`** for storing idempotency replay response bodies.
- **Real foreign keys** with `RESTRICT`/`CASCADE`/`SET NULL` to enforce the cascade table in `schema.md`.
- **Partial / composite indexes** (`skill_status_featured_idx`, `skill_status_category_idx`).

### 4.2 Migrations with Alembic

Schema changes are versioned, never applied by hand. `alembic revision --autogenerate` diffs the
SQLAlchemy models against the live DB; review the generated migration before `alembic upgrade head`.
The initial migration creates every table from `schema.md` plus its indexes and enum types, including
the `refresh_token` and `idempotency_key` support tables.

```bash
alembic revision --autogenerate -m "init schema"
alembic upgrade head
```

Migrations run as a step in CI and on deploy, before the new backend image starts serving.

### 4.3 Constraints & indexes (from `schema.md`)

The Index Recommendations table in `schema.md` is implemented verbatim. The case-insensitive unique
indexes are the critical ones — they back the duplicate guards:

```sql
CREATE EXTENSION IF NOT EXISTS citext;

-- case-insensitive uniqueness (schema.md validation notes)
CREATE UNIQUE INDEX user_email_uniq    ON "user" (lower(email));
CREATE UNIQUE INDEX skill_name_uniq    ON skill   (lower(name));
CREATE UNIQUE INDEX skill_source_uniq  ON skill   (lower(source_url));

-- review queue + catalog filtering
CREATE INDEX skill_status_idx          ON skill (status);
CREATE INDEX skill_status_featured_idx ON skill (status, is_featured);
CREATE INDEX skill_status_category_idx ON skill (status, category_id);
CREATE INDEX skill_owner_idx           ON skill (owner_id);
CREATE INDEX skill_published_at_idx    ON skill (published_at DESC);

-- departments & department-scoped visibility (internal tool)
CREATE INDEX        user_department_idx       ON "user" (department_id);
CREATE UNIQUE INDEX department_slug_uniq      ON department (slug);
CREATE UNIQUE INDEX department_name_uniq      ON department (lower(name));
CREATE INDEX        skill_department_dept_idx ON skill_department (department_id);

-- keyword search (GET /skill?q=)
CREATE INDEX skill_search_ft ON skill
  USING GIN (to_tsvector('english', name || ' ' || summary));

-- auth and retry support
CREATE UNIQUE INDEX refresh_token_hash_uniq ON refresh_token (token_hash);
CREATE INDEX refresh_token_user_idx ON refresh_token (user_id, expires_at);
CREATE UNIQUE INDEX idempotency_key_user_key_uniq ON idempotency_key (user_id, key);
CREATE INDEX idempotency_key_expiry_idx ON idempotency_key (expires_at);
```

### 4.4 Keyword search

`GET /skill?q=` (`api.md` §9.2) maps to a `to_tsvector / plainto_tsquery` match against the GIN index,
combined with the visibility filter and any category/tag filters:

```python
stmt = stmt.where(
    func.to_tsvector("english", Skill.name + " " + Skill.summary)
        .op("@@")(func.plainto_tsquery("english", q))
)
```

This satisfies `spec.md`'s "basic keyword, category, tag, and status filtering" without the excluded
"advanced semantic search" (`spec.md` §3 non-goals).

### 4.5 Seeding

A seed script (`python -m app.seed`, run automatically in Docker Compose before the server starts)
inserts:

- the controlled `category` set (Backend, Design, DevOps, Testing, Docs, Security, Performance,
  Review — `schema.md`) and a starter `tag` set;
- the default `department` set (Engineering, Design, Product, QA, Docs, Security);
- **one `admin` user** read from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (§6.2) so the catalog can be curated
  and members promoted on first run — this is the documented **initial-admin bootstrap** (`spec.md` §2
  account flow); no admin is ever self-registered;
- a few member accounts in different departments, plus `published`/`pending` skills with some assigned
  to departments and some left org-wide, so department-scoped visibility is demonstrable on first run.

`POST /auth/register` itself only creates `member` accounts and requires a valid `department_id`.
Seeding is idempotent (`ON CONFLICT DO NOTHING`), so it is safe to re-run.

---

## 5. Frontend — Next.js

### 5.1 Stack & key choices

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js App Router + React + TypeScript | Server Components for fast first paint of the authenticated catalog |
| Styling | Tailwind CSS | Matches the dense "command center" layout of `prototypes/version/prototypes-v1.html` |
| Server state | TanStack Query (React Query) | Caching, invalidation after lifecycle actions, idempotency-friendly mutations |
| Forms | React Hook Form + Zod | Field-level validation mirroring `schema.md` (§5.5) |
| API client | typed `fetch` wrapper in `lib/api/` | One function per `api.md` endpoint, returns `{ data }` or throws a typed `ApiError` |

### 5.2 Route structure (App Router)

Routes map onto the three core flows from `spec.md` §2:

```
src/app/
├── layout.tsx                     # shell: sidebar + signed-in account (member/admin); no visitor, no role switcher
├── login/page.tsx                 # POST /auth/login   (unauthenticated landing)
├── register/page.tsx              # POST /auth/register (email, display_name, password, department_id)
├── page.tsx                       # member catalog — GET /skill (department-scoped); redirects to /login with no token
├── skill/[slug]/page.tsx          # skill detail (auth-gated) — GET /skill/{slug}; copy-install + source link
├── submit/page.tsx                # member submission form (POST /skill)  — guarded: member/admin
├── my-skills/page.tsx             # member "My submissions" — GET /user/me/skill
├── review/
│   ├── page.tsx                   # admin review queue — GET /skill?status=pending&sort=name
│   └── [id]/page.tsx              # admin skill review + publish/reject/feature/unpublish + assign departments
├── departments/page.tsx           # admin: manage departments (CRUD /department) — guarded: admin
└── loading.tsx / error.tsx / not-found.tsx   # the loading/error/empty states spec.md §4 requires
```

- **Auth-gating — no anonymous access.** The root layout requires a valid access token stored in an
  httpOnly, SameSite cookie by the Next.js auth route handlers; a request with no/invalid token is
  redirected to `/login`. `/login` and `/register` are the only routes reachable while logged out.
- **Server Components still drive fast first paint** — the catalog and detail pages fetch on the
  server using the caller's httpOnly token cookies, so the department-scoped list renders without a
  client round-trip.
- **Interactive pages are Client Components** — the queue, submission form, per-skill admin actions,
  and department assignment need optimistic updates and React Query.

### 5.3 Session & permission-driven UI

`spec.md` §5: *admin-only actions must not be exposed through member interfaces* — and the chosen
UX rule from the command-center prototype is that **admin actions are hidden, not just disabled, for
non-admins**. There is no role switcher: the frontend reads the role from the authenticated account
(`GET /auth/me`) and reconfigures navigation, visible data, and available actions; signing out returns
to `/login`.

```tsx
// components/RoleGate.tsx
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useAuth();            // "member" | "admin"
  if (!allow.includes(role)) return null; // hidden, not disabled
  return <>{children}</>;
}

// usage in the skill detail / queue
<RoleGate allow={["admin"]}>
  <PublishButton skillId={skill.id} />
  <RejectButton skillId={skill.id} />
  <FeatureToggle skillId={skill.id} />
</RoleGate>
```

This is **defense in depth, not the security boundary** — the backend still returns `403` for a
forged admin action (§3.6). Hiding is UX; the API dependency is enforcement.

### 5.4 API client, auth, and idempotency

A thin typed server-side client centralizes the base URL, the `Authorization` header, the `{ data } /
{ error }` unwrapping, and transparent `access_token` refresh on `401 TOKEN_EXPIRED`. Browser code
does not read tokens from `localStorage`; Client Components call Next.js route handlers for
mutations, and those handlers read the httpOnly cookies and attach the Bearer token when calling
FastAPI:

```ts
// lib/api/server-client.ts
export async function apiFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const refreshed = body?.error?.code === "TOKEN_EXPIRED" ? await tryRefreshCookies() : null;
    if (refreshed) return apiFetch<T>(path, refreshed.accessToken, init);
    throw new ApiError(body.error);          // carries .code so callers branch on api.md §8 codes
  }
  return body.data as T;
}
```

Lifecycle mutations send a client-generated `Idempotency-Key` (UUID) so a double-click or a retry
after a flaky network is safe end-to-end (`api.md` §4):

```ts
// lib/api/skills.ts (called from a Next.js route handler)
export const publishSkill = (id: string, accessToken: string) =>
  apiFetch<Skill>(`/skill/${id}/publish`, accessToken, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
```

With React Query, the publish/reject/feature mutations invalidate the catalog and queue queries on
success, so the UI reflects the new state immediately. Buttons also disable while the mutation is
in-flight as a first line of double-click defense.

```ts
const publish = useMutation({
  mutationFn: publishSkill,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
});
```

### 5.5 Forms & validation (mirror `schema.md`)

The submission form validates client-side against a Zod schema that mirrors `schema.md`/`api.md`
constraints — then the backend validates again (the client check is for UX speed, not trust):

```ts
// lib/validation/skill.ts
export const skillSubmit = z.object({
  name: z.string().min(3).max(120),
  summary: z.string().min(10).max(280),
  category_id: z.string().uuid(),
  install_command: z.string().regex(/^(codex|claude|gemini|opencode)\s+skill\s+(install|add)\s+[A-Za-z0-9._/-]+$/,
    "Install command format is not valid."),
  source_url: z.string().max(500),
  tags: z.array(z.string()).default([]),
  usage_note: z.string().max(5000).optional(),
});
```

When the server returns `VALIDATION_ERROR` with `details[]`, or a `409 DUPLICATE_SKILL_NAME` /
`DUPLICATE_SOURCE_URL`, the form maps each into the matching field error — satisfying
`spec.md`'s "empty required fields blocked with clear feedback" and "duplicate submissions blocked
or clearly flagged" acceptance criteria.

### 5.6 Required UI states

`spec.md` §4 enumerates states the UI must implement; each has a concrete home:

| State | Where | Implementation |
| --- | --- | --- |
| Loading (catalog/detail) | `loading.tsx`, query `isPending` | skeletons |
| Error (data load fails) | `error.tsx`, query `isError` | error panel + retry |
| Empty / no-results | catalog & queue | "no results" message + **reset filters** button |
| Copy install — success/failure | detail page | `navigator.clipboard.writeText` → toast on resolve/reject |
| Action in-progress/success/failure | queue & detail | mutation `isPending`/`onError` → disabled button + toast |
| Submit success → pending | submit page | redirect to `/my-skills` with the new `pending` row visible |

The copy-install affordance specifically must report both success and failure (`spec.md` §2/§6) —
`navigator.clipboard` rejects on insecure contexts or denied permission, so handle the `.catch`.

---

## 6. Cross-Cutting Concerns

### 6.1 CORS

The backend allows the frontend origin(s) from `settings.cors_origins`, permits `Authorization`,
`Content-Type`, and `Idempotency-Key` headers, and the methods used by `api.md`:

```python
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
                   allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
                   allow_credentials=True)
```

### 6.2 Environment variables (`.env.example`)

| Var | Tier | Example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | backend | `postgresql+asyncpg://skill:skill@db:5432/skillhub` | DB connection |
| `JWT_SECRET` | backend | `change-me` | JWT signing (HS256) |
| `ACCESS_TOKEN_TTL_SECONDS` | backend | `900` | `api.md` §3 (15 min) |
| `REFRESH_TOKEN_TTL_SECONDS` | backend | `2592000` | `api.md` §3 (30 days) |
| `ADMIN_EMAIL` | backend | `admin@skillhub.local` | Seeded initial-admin login (§4.5) |
| `ADMIN_PASSWORD` | backend | `change-me-admin` | Seeded initial-admin password (§4.5); rotate after first login |
| `CORS_ORIGINS` | backend | `http://localhost:3000` | allowed frontend origin |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | `http://localhost:8000/api/v1` | base URL (`api.md` §2) |

Secrets (`JWT_SECRET`, DB password) come from the deploy environment / secret manager, never committed.

### 6.3 Local development with Docker Compose

```yaml
# docker-compose.yml  (abridged)
services:
  db:
    image: postgres:16
    environment: { POSTGRES_USER: skill, POSTGRES_PASSWORD: skill, POSTGRES_DB: skillhub }
    ports: ["5432:5432"]
  backend:
    build: ./backend
    command: sh -c "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    env_file: .env
    depends_on: [db]
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    command: npm run dev
    environment: { NEXT_PUBLIC_API_BASE_URL: http://localhost:8000/api/v1 }
    depends_on: [backend]
    ports: ["3000:3000"]
```

`docker compose up` brings up Postgres, runs migrations, starts FastAPI with autoreload, and serves
the Next.js dev server. Visit `http://localhost:3000` for the app and `http://localhost:8000/docs`
for FastAPI's auto-generated OpenAPI explorer (useful for verifying the `api.md` contract).

> The existing static prototype at `prototypes/version/prototypes-v1.html` remains the **design
> reference** for the command-center layout and interactions. This stack reproduces that single-file
> prototype as the real three-tier app while preserving its behavior (login/registration, the
> department-scoped catalog, admin department assignment, full interactivity).

---

## 7. Testing Strategy

| Layer | Tooling | What it covers |
| --- | --- | --- |
| Backend unit | `pytest` | Lifecycle state machine (every allowed/illegal transition), visibility filter, validators |
| Backend integration | `pytest-asyncio` + `httpx` against a throwaway Postgres | Each `api.md` endpoint: status codes, envelopes, error codes, the permission matrix (`api.md` §10) |
| Auth refresh | backend integration | Refresh-token hash lookup, rotation, expired/revoked-token rejection |
| Idempotency | dedicated tests | Double `publish`/`feature`/submit/department assignment → one domain mutation, replayed `Idempotency-Key` → same result, conflicting fingerprint → `IDEMPOTENCY_KEY_CONFLICT` |
| Frontend unit | Vitest + Testing Library | RoleGate hides admin actions; form validation maps server `details[]` to fields |
| E2E | Playwright | The flows from `spec.md` §2 end-to-end: logged-out → login/register, then member (department-scoped) and admin roles |

The **permission matrix** (`api.md` §10) and the **acceptance criteria** (`spec.md` §6) are the
checklists for "done" — every row of each should have a corresponding test.

### Definition of done (from `spec.md` §6)

The v1 deliverable is complete when login/registration, the department-scoped member catalog, skill
detail, member submission, admin review, publish/reject, department assignment, basic curation,
validation, and the empty/loading/error states all work end to end — across the member and admin
roles, with the department-scoped visibility and idempotency guarantees enforced by the backend and
database, not merely the UI.

---

## 8. Resolved v1 Decisions from `spec.md`

These decisions are fixed for v1 (`spec.md` §7) and should be implemented as written:

| Decision | Implementation rule | Where it bites |
| --- | --- | --- |
| Auth method for v1 | Email + password → JWT access token + opaque rotating refresh token (`api.md` §3); SSO/directory sync is future | `auth_service`, `core/security`, `refresh_token` |
| Initial admin bootstrap | Seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (§4.5); others promoted via `PATCH /user/{id}` | seed script, member-admin router |
| Member registration model | Open self-registration (any email) with a required department; invite/domain-allowlist is a later option | `auth` register validation |
| New published skill visibility | Org-wide until an admin assigns departments | `PUT /skill/{id}/departments`, visibility filter |
| Valid install-command formats | The `schema.md` regex (`codex/claude/gemini/opencode … install/add …`) | `SkillCreate` validator, DB check |
| Edit published skill vs. new pending review | Edits allowed only on `draft`/`rejected`; published edits are out of scope for v1 | `PATCH /skill/{id}` guard |
| Mandatory metadata beyond the basics | `name, summary, category_id, install_command, source_url` required; rest optional | `SkillCreate`, DB `NOT NULL` |
| Unpublish = restorable vs. delete | `unpublished` is restorable (re-`publish`); hard delete is admin-only | lifecycle service |

Any later change to these defaults should update `spec.md`, `schema.md`, `api.md`, and this guide in the same change.
