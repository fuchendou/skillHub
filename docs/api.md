# Skill Hub — HTTP API (`api.md`)

REST API for the Skill Hub v1. It exposes the entities defined in [`schema.md`](schema.md) — `user`, `department`, `category`, `tag`, `skill`, `skill_tag`, `skill_department`, `review_action`, `refresh_token`, and `idempotency_key` — and enforces the permission boundaries from [`spec.md`](spec.md).

## 1. Design Principles

- **RESTful & resource-oriented**: resources are nouns; HTTP verbs express intent (`GET` read, `POST` create, `PATCH` partial update, `DELETE` remove). Lifecycle transitions that are not plain CRUD are modeled as explicit sub-resource actions (e.g. `POST /skill/{id}/publish`).
- **Singular resource names**: every path segment is singular (`/skill`, `/category`, `/tag`, `/user`) to match the entity names in `schema.md`. A collection is still returned as a JSON array — only the noun stays singular.
- **Stateless**: every request is authenticated on its own via a bearer token; the server keeps no session affinity.
- **JSON only**: requests and responses use `application/json; charset=utf-8`.
- **Consistent envelopes**: a single success shape and a single error shape (see §5–§6).
- **Predictable status codes**: `200/201/204` success, `400/401/403/404/409/429` client errors, `500` server error.

## 2. Base URL

```
https://api.skillhub.example/api/v1
```

All paths below are relative to this base. The version is pinned in the path (`/api/v1`); breaking changes ship under `/api/v2`.

## 3. Authentication

**Method: JWT access token + opaque refresh token.** A client obtains a short-lived JWT `access_token` and a longer-lived opaque `refresh_token` from `POST /auth/login`, then sends the access token on every protected API request:

```
Authorization: Bearer <access_token>
```

| Token | Lifetime | Purpose |
| --- | --- | --- |
| `access_token` | 15 min | Sent on protected requests. JWT claims: `sub` (`user.id`), `role` (`member`\|`admin`), `exp`. |
| `refresh_token` | 30 days | Opaque random token, stored only as a hash in `refresh_token`; exchanged at `POST /auth/refresh` for a new access/refresh pair. Refresh rotates the token and revokes the previous row. |

**Authorization tiers** (map directly to `user.role` in `schema.md`):

| Tier | How identified | Rights |
| --- | --- | --- |
| **unauthenticated** | no / invalid `Authorization` header | Reach only the auth endpoints (`/auth/register`, `/auth/login`, `/auth/refresh`) and `GET /department` (so the registration form can list departments). Every other route → `401`. |
| **member** | valid token, `role = member` | Read `published` skills available to the member's department (org-wide or assigned) + categories, tags, departments; submit skills; read/edit/resubmit **own** `draft`/`rejected` skills. |
| **admin** | valid token, `role = admin` | Full curation access: review all skills, publish `pending`/`unpublished` skills, reject `pending` skills, feature/unfeature and unpublish `published` skills, assign published skills to departments, and manage categories, tags, departments, and members. |

**Auth requirement per endpoint** is listed in each endpoint's **Auth** column (`Public` — only the auth / registration-support routes — `member`, or `admin`). A missing/expired token on a protected route → `401`; a valid token without sufficient role → `403`.

## 4. Common Request Conventions

| Header | Required on | Value |
| --- | --- | --- |
| `Content-Type` | `POST`, `PATCH`, `PUT` | `application/json` |
| `Authorization` | protected routes | `Bearer <access_token>` |
| `Idempotency-Key` | optional, on mutating retry-safe routes | client-generated UUID/string scoped to the authenticated user; same key + same request replays the original result without creating duplicate domain rows or `review_action`; same key + different request → `IDEMPOTENCY_KEY_CONFLICT` |

- **IDs** in paths are the entity `uuid`. Skills and categories also accept their `slug` on read routes (`GET /skill/{id|slug}`).
- **Timestamps** in responses are ISO 8601 UTC (e.g. `2026-06-15T09:30:00Z`).

## 5. Success Response Envelope

**Single resource** (`200`/`201`):

```json
{
  "data": {
    "id": "9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71",
    "type": "skill"
  }
}
```

**Collection** (`200`) — always paginated (see §7):

```json
{
  "data": [ { "id": "..." } ],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

`204 No Content` is returned for successful `DELETE` and carries no body.

## 6. Error Response Envelope

Every non-2xx response uses this shape:

```json
{
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "No skill exists with id 9f12c3a4-....",
    "details": []
  }
}
```

- `code` — stable business error code (see §8). Clients branch on this, not on `message`.
- `message` — human-readable, safe to display.
- `details` — array, used by `VALIDATION_ERROR` for field-level errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "summary", "message": "A short description is required." },
      { "field": "install_command", "message": "Install command format is not valid." }
    ]
  }
}
```

## 7. Pagination

List endpoints accept:

| Query param | Type | Required | Default | Range | Description |
| --- | --- | --- | --- | --- | --- |
| `page` | int | No | `1` | ≥ 1 | 1-based page number |
| `limit` | int | No | `20` | 1–100 | Items per page |

The response `pagination` object returns `total` (matching rows), `page` (echoed), `limit` (echoed), and `totalPages` (`ceil(total / limit)`). Example: `GET /skill?page=2&limit=20`.

---

## 8. Error Code Table

| Business code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | One or more body/query fields failed validation (see `details`) |
| `INVALID_INSTALL_COMMAND` | 400 | `install_command` does not match the approved format (`schema.md` → `skill.install_command`) |
| `MISSING_REJECTION_REASON` | 400 | `reject` called without a `reason` |
| `UNAUTHENTICATED` | 401 | Missing or malformed `Authorization` header |
| `INVALID_CREDENTIALS` | 401 | Email/password did not match at login |
| `TOKEN_EXPIRED` | 401 | `access_token` expired — refresh and retry |
| `FORBIDDEN_ROLE` | 403 | Authenticated but role lacks permission (e.g. member calling an admin action) |
| `NOT_OWNER` | 403 | Member tried to edit a skill they do not own |
| `SKILL_NOT_FOUND` | 404 | No skill with that id/slug, or not visible to the caller |
| `CATEGORY_NOT_FOUND` | 404 | No category with that id/slug |
| `TAG_NOT_FOUND` | 404 | No tag with that id/slug |
| `USER_NOT_FOUND` | 404 | No user with that id |
| `DEPARTMENT_NOT_FOUND` | 404 | No department with that id/slug |
| `ROUTE_NOT_FOUND` | 404 | Unknown path |
| `DUPLICATE_SKILL_NAME` | 409 | A skill with this `name` already exists |
| `DUPLICATE_SOURCE_URL` | 409 | A skill with this `source_url` already exists |
| `EMAIL_ALREADY_EXISTS` | 409 | Registration email already in use |
| `INVALID_STATE_TRANSITION` | 409 | Lifecycle action not allowed from the current `status` (e.g. reject a published skill) |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | Reused `Idempotency-Key` with a different method/path/body fingerprint |
| `RESOURCE_IN_USE` | 409 | Delete/update is blocked by existing references, such as a category used by skills |
| `RATE_LIMITED` | 429 | Too many requests; see `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

> **Idempotent lifecycle actions** (publish an already-`published` skill, feature an already-featured one) return `200` with the current resource — **not** a `409`. `409 INVALID_STATE_TRANSITION` is reserved for transitions that are never legal from the current status.

---

## 9. Endpoints

### 9.1 Auth — `/auth`

#### Register

`POST /auth/register` · **Auth:** Public · Creates a `member` account (always role `member`; admins are seeded or promoted, never self-registered).

Body:

| Field | Type | Required | Example |
| --- | --- | --- | --- |
| `email` | string | Yes | `"mina@example.com"` |
| `password` | string | Yes (8–72 chars) | `"s3cret-pass"` |
| `display_name` | string | Yes | `"Mina Torres"` |
| `department_id` | uuid | Yes | `"759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48"` (pick from `GET /department`) → else `DEPARTMENT_NOT_FOUND` |

```json
// 201 Created
{ "data": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "email": "mina@example.com", "display_name": "Mina Torres", "role": "member", "department": { "id": "759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "name": "Engineering", "slug": "engineering" }, "created_at": "2026-06-15T09:00:00Z" } }
```

Errors: `VALIDATION_ERROR` (400), `DEPARTMENT_NOT_FOUND` (404), `EMAIL_ALREADY_EXISTS` (409).

#### Login

`POST /auth/login` · **Auth:** Public · Returns tokens.

Body: `{ "email": "...", "password": "..." }`

```json
// 200 OK
{
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "rft_8f7f4b7a6f3d4e1a9c2b0d5e6f7a8b9c",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "display_name": "Mina Torres", "role": "member", "department": { "id": "759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "slug": "engineering" } }
  }
}
```

Errors: `INVALID_CREDENTIALS` (401).

#### Refresh

`POST /auth/refresh` · **Auth:** Public (refresh token in body) · Body: `{ "refresh_token": "..." }` → same shape as login. The server verifies the hashed token row, rejects expired/revoked tokens, revokes the used row, and returns a fresh access/refresh pair. Errors: `TOKEN_EXPIRED` (401), `UNAUTHENTICATED` (401).

#### Current user

`GET /auth/me` · **Auth:** member / admin · Returns the authenticated `user` (no `password_hash`).

```json
// 200 OK
{ "data": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "email": "mina@example.com", "display_name": "Mina Torres", "role": "member", "department": { "id": "759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "name": "Engineering", "slug": "engineering" }, "bio": null, "avatar_url": null, "created_at": "2026-06-15T09:00:00Z" } }
```

Errors: `UNAUTHENTICATED` (401).

> **Initial admin & promotion.** There is no public endpoint to create an `admin`. The first admin is **seeded** (`implement.md` §4.5); thereafter an admin promotes a member to `admin` via `PATCH /user/{id}` (§9.8).

---

### 9.2 Skill — `/skill`

The `skill` resource (see `schema.md` → `skill`). A skill response embeds its `category`, `owner`, `tags` array, and `departments` array for convenience (`departments` is empty when the skill is org-wide — available to all departments):

```json
{
  "id": "9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71",
  "name": "Schema Drift Watcher",
  "slug": "schema-drift-watcher",
  "summary": "Compares database migrations with application models and flags mismatched fields.",
  "status": "published",
  "is_featured": false,
  "install_command": "codex skill install mina/schema-drift-watcher",
  "source_url": "github.com/mina/schema-drift-watcher",
  "usage_note": "Run before each release...",
  "risk_label": "Low risk",
  "rejection_reason": null,
  "category": { "id": "3893eead-4ce4-49dd-9cc3-a3a5bf5d9d10", "name": "Backend", "slug": "backend" },
  "owner": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "display_name": "Mina Torres" },
  "tags": [ { "id": "e4f3d9ce-8b22-4efc-a364-4e1b7ab34291", "name": "database", "slug": "database" } ],
  "departments": [ { "id": "759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "name": "Engineering", "slug": "engineering" } ],
  "published_at": "2026-06-12T08:00:00Z",
  "created_at": "2026-06-10T10:00:00Z",
  "updated_at": "2026-06-12T08:00:00Z"
}
```

#### List / browse skills

`GET /skill` · **Auth:** member / admin (admin unlocks non-published status filters)

Query parameters:

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page`, `limit` | int | No | `1`, `20` | Pagination (§7) |
| `q` | string | No | — | Keyword search over `name` + `summary` |
| `category` | string | No | — | Category `slug` filter |
| `tag` | string | No | — | Tag `slug` filter |
| `featured` | boolean | No | — | `true` → only `is_featured` |
| `sort` | enum | No | `newest` | `newest` \| `name` \| `featured` |
| `status` | enum | No | `published` | **Visibility-gated.** Members are forced to `published` (and only the department-visible ones). Admins may pass `pending`/`rejected`/`unpublished`/`draft`/`all`. Members may pass these only in combination with `owner=me`. |
| `owner` | string | No | — | `me` → caller's own skills (member/admin). |

Visibility is always re-applied server-side per §3 regardless of query: a member receives only `published` skills available to their department (org-wide or assigned) plus their own submissions; passing `status=pending` without `owner=me` still yields only those rows.

```json
// 200 OK
{
  "data": [ { "id": "9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71", "name": "Schema Drift Watcher", "status": "published", "is_featured": false, "category": { "slug": "backend" }, "owner": { "display_name": "Mina Torres" } } ],
  "pagination": { "total": 4, "page": 1, "limit": 20, "totalPages": 1 }
}
```

Examples: review queue → `GET /skill?status=pending&sort=name` (admin); my submissions → `GET /skill?owner=me` (member); featured backend → `GET /skill?category=backend&featured=true`.

#### Get one skill

`GET /skill/{id|slug}` · **Auth:** member for a `published` skill available to their department; owner/admin for non-visible records.

```json
// 200 OK
{ "data": { "id": "9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71", "name": "Schema Drift Watcher", "status": "published", "install_command": "codex skill install mina/schema-drift-watcher" } }
```

Errors: `SKILL_NOT_FOUND` (404) — also returned when the row exists but is not visible to the caller (avoids leaking non-public records).

#### Create / submit a skill

`POST /skill` · **Auth:** member / admin · New skills enter `status = pending` (or `draft` when `"draft": true`). No department assignment is required before review; if a skill is published with an empty department set, it is org-wide. Appends a `submit` `review_action` only when the created skill enters `pending`.

Body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Unique (case-insensitive) → else `DUPLICATE_SKILL_NAME` |
| `summary` | string | Yes | 10–280 chars |
| `category_id` | uuid | Yes | Must exist → else `CATEGORY_NOT_FOUND` |
| `install_command` | string | Yes | Approved format → else `INVALID_INSTALL_COMMAND` |
| `source_url` | string | Yes | Unique (case-insensitive) → else `DUPLICATE_SOURCE_URL` |
| `tags` | string[] | No | Tag slugs; unknown slugs are created on the fly |
| `usage_note` | string | No | ≤ 5000 chars |
| `draft` | boolean | No | `true` keeps it as `draft` instead of submitting |

```json
// Request
{ "name": "Dependency Drift Auditor", "summary": "Flags dependency drift across lockfiles.", "category_id": "3893eead-4ce4-49dd-9cc3-a3a5bf5d9d10", "install_command": "codex skill install mina/dependency-drift-auditor", "source_url": "github.com/mina/dependency-drift-auditor", "tags": ["backend", "dependencies"] }
```

```json
// 201 Created
{ "data": { "id": "c5bd0fc8-ec7c-4b1e-a776-bb6b66cc8e8a", "name": "Dependency Drift Auditor", "status": "pending", "owner": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "display_name": "Mina Torres" }, "created_at": "2026-06-15T09:30:00Z" } }
```

Errors: `VALIDATION_ERROR` (400), `INVALID_INSTALL_COMMAND` (400), `DUPLICATE_SKILL_NAME` (409), `DUPLICATE_SOURCE_URL` (409), `IDEMPOTENCY_KEY_CONFLICT` (409), `UNAUTHENTICATED` (401).

#### Update a skill

`PATCH /skill/{id}` · **Auth:** owner of a `draft`/`rejected` skill, or admin · Partial update; appends an `edit` `review_action`.

Body: any subset of `summary`, `category_id`, `install_command`, `source_url`, `tags`, `usage_note`. A member editing a skill in any other status, or one they do not own, gets `403`. (Department visibility is changed via `PUT /skill/{id}/departments`, not here.)

```json
// 200 OK
{ "data": { "id": "0d61de50-d27c-47c4-8de1-04ac1f6b9f58", "status": "rejected", "summary": "Updated description.", "updated_at": "2026-06-15T10:00:00Z" } }
```

Errors: `VALIDATION_ERROR` (400), `INVALID_INSTALL_COMMAND` (400), `NOT_OWNER` (403), `FORBIDDEN_ROLE` (403), `SKILL_NOT_FOUND` (404), `DUPLICATE_SOURCE_URL` (409).

#### Delete a skill

`DELETE /skill/{id}` · **Auth:** admin (any), or owner of a `draft` · Hard-deletes the skill; `skill_tag`, `skill_department`, and `review_action` rows cascade (`schema.md` → cascade rules). Returns `204 No Content`. Errors: `FORBIDDEN_ROLE` (403), `SKILL_NOT_FOUND` (404).

#### Assign a skill to departments

`PUT /skill/{id}/departments` · **Auth:** admin · Replaces the skill's department-visibility set (the `skill_department` rows). An empty array makes the skill **org-wide** (available to all departments). Idempotent — re-sending the same set returns `200` and creates no duplicate rows. Assignment is meaningful only while the skill is `published`.

Body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `department_ids` | uuid[] | Yes | Departments allowed to see the skill; `[]` = org-wide. Any unknown id → `DEPARTMENT_NOT_FOUND` |

```json
// PUT /skill/9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71/departments   Request
{ "department_ids": ["759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "d4f4d4e2-a9d6-4fc6-9015-0e3f4476104d"] }
```

```json
// 200 OK
{ "data": { "id": "9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71", "departments": [ { "id": "759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "name": "Engineering", "slug": "engineering" }, { "id": "d4f4d4e2-a9d6-4fc6-9015-0e3f4476104d", "name": "QA", "slug": "qa" } ] } }
```

Errors: `FORBIDDEN_ROLE` (403), `SKILL_NOT_FOUND` (404), `DEPARTMENT_NOT_FOUND` (404), `VALIDATION_ERROR` (400), `IDEMPOTENCY_KEY_CONFLICT` (409).

---

### 9.3 Skill lifecycle actions — `/skill/{id}/…`

All are **admin-only** except `resubmit`. Each accepted action appends one `review_action` and is **idempotent** (safe to retry / double-click). Send an `Idempotency-Key` header to make retries provably safe.

| Action | Method & Path | Auth | Body | Effect (`from → to`) |
| --- | --- | --- | --- | --- |
| Publish | `POST /skill/{id}/publish` | admin | — | `pending`/`unpublished` → `published`; sets `published_at` if first time |
| Reject | `POST /skill/{id}/reject` | admin | `{ "reason": "..." }` (required) | `pending` → `rejected`; stores `rejection_reason`; `is_featured → false` |
| Feature | `POST /skill/{id}/feature` | admin | — | `published` → `published`, `is_featured = true` |
| Unfeature | `DELETE /skill/{id}/feature` | admin | — | `is_featured = false` |
| Unpublish | `POST /skill/{id}/unpublish` | admin | — | `published` → `unpublished`; `is_featured → false` |
| Resubmit | `POST /skill/{id}/resubmit` | owner | — | `rejected`/`draft` → `pending`; clears `rejection_reason` |

```json
// POST /skill/0d61de50-d27c-47c4-8de1-04ac1f6b9f58/reject   Request
{ "reason": "Likely duplicate of an existing token-audit skill. Please link the canonical source." }
```

```json
// 200 OK
{ "data": { "id": "0d61de50-d27c-47c4-8de1-04ac1f6b9f58", "status": "rejected", "is_featured": false, "rejection_reason": "Likely duplicate of an existing token-audit skill. Please link the canonical source.", "updated_at": "2026-06-15T10:05:00Z" } }
```

Errors: `FORBIDDEN_ROLE` (403), `NOT_OWNER` (403, resubmit), `MISSING_REJECTION_REASON` (400, reject), `SKILL_NOT_FOUND` (404), `INVALID_STATE_TRANSITION` (409, e.g. featuring a non-published skill), `IDEMPOTENCY_KEY_CONFLICT` (409).

#### Skill action history

`GET /skill/{id}/review-action` · **Auth:** owner / admin · Paginated `review_action` log for the skill (newest first), per `schema.md` → `review_action`.

```json
// 200 OK
{
  "data": [
    { "id": "b1c74b7d-fc36-42b5-8b01-c6d328a3ee7c", "action": "reject", "from_status": "pending", "to_status": "rejected", "reason": "Likely duplicate...", "actor": { "id": "baf1c2e5-9d81-4a67-b56b-0dc2c2e0d8e2", "display_name": "Priya Nayar" }, "created_at": "2026-06-15T10:05:00Z" },
    { "id": "f238da6b-99e6-41c7-9d8c-e2ea46650f4d", "action": "submit", "from_status": null, "to_status": "pending", "reason": null, "actor": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "display_name": "Mina Torres" }, "created_at": "2026-06-14T18:00:00Z" }
  ],
  "pagination": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 9.4 Category — `/category`

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/category` | `GET` | member / admin | List categories (ordered by `sort_order`), paginated |
| `/category/{id\|slug}` | `GET` | member / admin | Single category |
| `/category` | `POST` | admin | Create — body `{ "name", "slug?", "description?", "sort_order?" }` → `201` |
| `/category/{id}` | `PATCH` | admin | Update |
| `/category/{id}` | `DELETE` | admin | Delete — blocked while skills reference it (`schema.md` `RESTRICT`) → `RESOURCE_IN_USE` |

```json
// GET /category  → 200 OK
{
  "data": [ { "id": "3893eead-4ce4-49dd-9cc3-a3a5bf5d9d10", "name": "Backend", "slug": "backend", "sort_order": 0 } ],
  "pagination": { "total": 8, "page": 1, "limit": 20, "totalPages": 1 }
}
```

Errors: `CATEGORY_NOT_FOUND` (404), `FORBIDDEN_ROLE` (403), `VALIDATION_ERROR` (400), `RESOURCE_IN_USE` (409).

---

### 9.5 Tag — `/tag`

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/tag` | `GET` | member / admin | List tags (supports `?q=` prefix search), paginated |
| `/tag/{id\|slug}` | `GET` | member / admin | Single tag |
| `/tag` | `POST` | admin | Create — body `{ "name", "slug?" }` → `201` |
| `/tag/{id}` | `DELETE` | admin | Delete — `skill_tag` links cascade (`schema.md`) → `204` |

```json
// GET /tag?q=data  → 200 OK
{
  "data": [ { "id": "e4f3d9ce-8b22-4efc-a364-4e1b7ab34291", "name": "database", "slug": "database" } ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

Errors: `TAG_NOT_FOUND` (404), `FORBIDDEN_ROLE` (403).

---

### 9.6 User — `/user`

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/user/{id}` | `GET` | member / admin | Profile: `id`, `display_name`, `department`, `bio`, `avatar_url`, count of published skills. Never returns `email`/`password_hash`. |
| `/user/me` | `PATCH` | member / admin | Update own `display_name`, `bio`, `avatar_url` |
| `/user/me/skill` | `GET` | member / admin | Convenience alias for `GET /skill?owner=me` — the caller's own submissions across all statuses |

```json
// GET /user/me/skill  → 200 OK
{
  "data": [
    { "id": "9b28d2e4-4ff1-4f0f-a8e0-0f427f129f71", "name": "Schema Drift Watcher", "status": "published" },
    { "id": "0d61de50-d27c-47c4-8de1-04ac1f6b9f58", "name": "Secret Scanner Lite", "status": "rejected", "rejection_reason": "Install command pointed to an unverified mirror." }
  ],
  "pagination": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 }
}
```

Errors: `USER_NOT_FOUND` (404), `UNAUTHENTICATED` (401).

---

### 9.7 Department — `/department`

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/department` | `GET` | Public | List departments (used by the registration form and member/admin filters), paginated |
| `/department/{id\|slug}` | `GET` | member / admin | Single department |
| `/department` | `POST` | admin | Create — body `{ "name", "slug?" }` → `201` |
| `/department/{id}` | `PATCH` | admin | Update `name`/`slug` |
| `/department/{id}` | `DELETE` | admin | Delete — blocked while members or skills reference it (`schema.md` `RESTRICT`) → `RESOURCE_IN_USE` |

```json
// GET /department  → 200 OK
{
  "data": [ { "id": "759fc1d8-2044-4d6b-9ab1-5f8bde9c3f48", "name": "Engineering", "slug": "engineering" }, { "id": "3f5bb217-295c-4e99-a21c-94025d77c78e", "name": "Design", "slug": "design" } ],
  "pagination": { "total": 6, "page": 1, "limit": 20, "totalPages": 1 }
}
```

Errors: `DEPARTMENT_NOT_FOUND` (404), `FORBIDDEN_ROLE` (403), `VALIDATION_ERROR` (400), `RESOURCE_IN_USE` (409).

---

### 9.8 Member administration — `/user` (admin)

Admin-only management of accounts (ties to `schema.md` → `user`). This is how the seeded admin grants `admin` to others and how members are placed in or moved between departments.

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/user` | `GET` | admin | List accounts; filters `?role=member\|admin`, `?department={slug}`, `?q=`; includes `email`, `role`, `department`, `is_active` |
| `/user/{id}` | `PATCH` | admin | Update a user's `role` (promote/demote), `department_id` (reassign), or `is_active` (soft-disable). Setting `role = member` requires a `department_id`. |

```json
// PATCH /user/7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31   Request
{ "role": "admin" }
```

```json
// 200 OK
{ "data": { "id": "7f9c0d62-a9d4-4b7f-9f9b-4c0e746d6a31", "display_name": "Mina Torres", "role": "admin", "department": null, "is_active": true } }
```

Errors: `USER_NOT_FOUND` (404), `DEPARTMENT_NOT_FOUND` (404), `FORBIDDEN_ROLE` (403), `VALIDATION_ERROR` (400).

---

## 10. Permission Matrix

Quick cross-reference of who may call what (ties back to `spec.md` §5 and `schema.md` → `user.role`).

| Operation | Member | Admin |
| --- | --- | --- |
| `GET /department` | ✅ | ✅ |
| `GET /skill` (catalog), `GET /category`, `GET /tag` | ✅ dept-scoped | ✅ all |
| `GET /skill/{id}` for a `published` skill available to the caller's department | ✅ | ✅ |
| `GET /skill/{id}` for a non-visible / non-public skill | own only, else `404` | ✅ |
| `POST /skill` (submit) | ✅ | ✅ |
| `PATCH /skill/{id}` (`draft`/`rejected`) | own only | ✅ |
| `POST /skill/{id}/resubmit` | own only | ✅ |
| `publish` / `reject` / `feature` / `unfeature` / `unpublish` | ❌ `403` | ✅ |
| `PUT /skill/{id}/departments` (assign visibility) | ❌ `403` | ✅ |
| `GET /skill/{id}/review-action` | own only | ✅ |
| Manage `category` / `tag` / `department` | ❌ `403` | ✅ |
| `GET /user`, `PATCH /user/{id}` (member administration) | ❌ `403` | ✅ |

Unauthenticated requests receive `401` on every route except `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, and `GET /department`. A protected route returns `401` when unauthenticated and `403` (`FORBIDDEN_ROLE` / `NOT_OWNER`) when authenticated without rights.
