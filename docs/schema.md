# Skill Hub — Data Model (`schema.md`)

Data model for the Skill Hub v1 described in [`spec.md`](spec.md) and realized in the direction-2 "Review Command Center" prototype. The HTTP surface that exposes this model is defined in [`api.md`](api.md); entity and field names used here are referenced verbatim there.

## Conventions

- **Naming**: every table and field name is **singular**, `snake_case`. Join tables read `parent_child` (e.g. `skill_tag`).
- **Primary keys**: every entity has an `id` of type `uuid` (UUID v4, generated server-side). UUIDs are immutable, so `ON UPDATE` is not applicable to any foreign key (marked `N/A`).
- **Timestamps**: `created_at` and `updated_at` exist on every mutable entity, type `datetime`, stored as ISO 8601 UTC. Join/audit tables that do not support in-place editing carry only `created_at`; `review_action` is append-only.
- **Type vocabulary**: `uuid`, `string(n)` (max length `n`), `text` (long text), `int`, `boolean`, `datetime`, `enum`, `json`.
- **Access**: Skill Hub is internal and login-gated — there is no anonymous "visitor". Unauthenticated requests reach only the auth endpoints plus `GET /department` for the registration form; every catalog read/write requires a session. The two persisted roles are `member` and `admin`.

## Entity Relationship Overview

| Relationship | Type | Tables | Resolved via |
| --- | --- | --- | --- |
| A user owns many skills | 1 : N | `user` → `skill` | `skill.owner_id` |
| A category groups many skills | 1 : N | `category` → `skill` | `skill.category_id` |
| A skill has many tags / a tag labels many skills | M : N | `skill` ↔ `tag` | `skill_tag` |
| A user acts on many skills (audit/lifecycle log) | M : N (history) | `user` ↔ `skill` | `review_action` |
| A department groups many members | 1 : N | `department` → `user` | `user.department_id` |
| A published skill is available to many departments / a department exposes many skills | M : N | `skill` ↔ `department` | `skill_department` |
| A user has refresh tokens | 1 : N | `user` → `refresh_token` | `refresh_token.user_id` |
| A user owns retry keys for mutating requests | 1 : N | `user` → `idempotency_key` | `idempotency_key.user_id` |

`review_action` is the user-to-skill relation table (the "UserSkillRelation" of the brief): each row records one lifecycle action a user performed on a skill (submit, publish, reject, feature, …). It powers the command center's audit trail and rejection-reason history. Retry safety is handled by the separate `idempotency_key` table.

---

## Entity: `user`

Registered account. Holds members (employees) and admins. There is no anonymous catalog access — unauthenticated users have no row and can reach only auth endpoints plus `GET /department` for registration.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `email` | string(255) | Yes | — | Yes (case-insensitive) | valid email; stored lowercase | Login identity |
| `password_hash` | string(255) | Yes | — | No | argon2/bcrypt digest | Credential; **never** returned by the API |
| `display_name` | string(80) | Yes | — | No | 2–80 chars | Name shown as submitter / publisher |
| `role` | enum | Yes | `member` | No | `member` \| `admin` | Authorization role — see [Status & Enum Reference](#status--enum-reference) |
| `department_id` | uuid | Cond. | `null` | No | FK → `department.id` | The member's department; **required when `role = member`**, `null` for `admin` |
| `bio` | string(280) | No | `null` | No | ≤ 280 chars | Optional profile blurb |
| `avatar_url` | string(500) | No | `null` | No | `http`/`https` URL | Optional avatar image |
| `is_active` | boolean | Yes | `true` | No | — | Soft-disable; login is blocked when `false` (preferred over hard delete) |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Creation time |
| `updated_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Last modification time |

---

## Entity: `department`

Org unit a member belongs to, and the unit an admin assigns published skills to. Admin-managed controlled list (like `category`). Seeded set: Engineering, Design, Product, QA, Docs, Security.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `name` | string(60) | Yes | — | Yes | 1–60 chars | Display name |
| `slug` | string(70) | Yes | — | Yes | `^[a-z0-9-]+$` | URL-safe identifier |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Creation time |
| `updated_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Last modification time |

---

## Entity: `category`

Controlled taxonomy a skill belongs to (exactly one). Seeded set: Backend, Design, DevOps, Testing, Docs, Security, Performance, Review.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `name` | string(40) | Yes | — | Yes | 1–40 chars | Display name |
| `slug` | string(50) | Yes | — | Yes | `^[a-z0-9-]+$` | URL-safe identifier (category pages) |
| `description` | string(280) | No | `null` | No | ≤ 280 chars | Short description of the category scope |
| `sort_order` | int | Yes | `0` | No | ≥ 0 | Manual ordering in the category strip |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Creation time |
| `updated_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Last modification time |

---

## Entity: `tag`

Free-form, lightweight label for granular discovery. Many-to-many with `skill` through `skill_tag`.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `name` | string(40) | Yes | — | Yes | 1–40 chars | Display label |
| `slug` | string(50) | Yes | — | Yes | `^[a-z0-9-]+$` | URL-safe identifier (tag pages) |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Creation time |
| `updated_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Last modification time |

---

## Entity: `skill`

The core record. Carries metadata, the install command, the lifecycle status, and the featured flag.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `name` | string(120) | Yes | — | Yes (case-insensitive) | 3–120 chars | Skill name; duplicates are rejected at submit time |
| `slug` | string(140) | Yes | generated | Yes | `^[a-z0-9-]+$` | Derived from `name`; stable detail-page URL |
| `summary` | string(280) | Yes | — | No | 10–280 chars | One-sentence short description |
| `owner_id` | uuid | Yes | — | No | FK → `user.id` | Member who submitted the skill |
| `category_id` | uuid | Yes | — | No | FK → `category.id` | Exactly one category |
| `status` | enum | Yes | `draft` | No | `draft`\|`pending`\|`published`\|`rejected`\|`unpublished` | Lifecycle state — see [enum reference](#skillstatus) |
| `is_featured` | boolean | Yes | `false` | No | — | Admin-curated highlight; only meaningful while `published` |
| `install_command` | string(255) | Yes | — | No | matches `^(codex\|claude\|gemini\|opencode)\s+skill\s+(install\|add)\s+[A-Za-z0-9._/-]+$` | Approved install command format |
| `source_url` | string(500) | Yes | — | Yes (case-insensitive) | host/path or `http`/`https` URL | Source / reference link; duplicates rejected at submit time |
| `usage_note` | text | No | `null` | No | ≤ 5000 chars | Long-form usage notes |
| `risk_label` | string(40) | No | `Low risk` | No | e.g. `Low risk`, `Needs duplicate check`, `Needs source review` | Reviewer-facing risk hint shown in the queue |
| `rejection_reason` | string(500) | No | `null` | No | ≤ 500 chars | Required content when `status = rejected`; cleared on resubmit |
| `published_at` | datetime | No | `null` | No | ISO 8601 UTC | Set the first time the skill is published; drives "newest" sort |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Creation time |
| `updated_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Last modification time |

**Visibility rule (enforced in the API, not the schema):** a `member` sees a `published` row only when it is **org-wide** (no `skill_department` rows) or assigned to the member's `department_id` (a matching `skill_department` row); a member additionally sees any row where `owner_id` = their id, regardless of status. Admins see all rows. Unauthenticated requests see nothing — authentication is required for every catalog read.

---

## Entity: `skill_tag`

Join table for the `skill` ↔ `tag` many-to-many relationship. Composite primary key; one row per unique pair.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | uuid | Yes | — | Yes (composite PK) | FK → `skill.id` | Linked skill |
| `tag_id` | uuid | Yes | — | Yes (composite PK) | FK → `tag.id` | Linked tag |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Link creation time |

Primary key = (`skill_id`, `tag_id`), which also enforces the uniqueness of each pair.

---

## Entity: `skill_department`

Join table for the `skill` ↔ `department` many-to-many relationship that scopes a **published** skill's visibility. A skill with **no** `skill_department` rows is **org-wide** (available to all departments); one or more rows restrict it to exactly those departments. Composite primary key; one row per unique pair.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | uuid | Yes | — | Yes (composite PK) | FK → `skill.id` | Scoped skill |
| `department_id` | uuid | Yes | — | Yes (composite PK) | FK → `department.id` | Department the skill is available to |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Assignment time |

Primary key = (`skill_id`, `department_id`). Only admins create or remove these rows; the assignment is meaningful only while the skill is `published`.

---

## Entity: `review_action`

Append-only audit log of every lifecycle action a user performs on a skill. Immutable (no `updated_at`). This is the relation entity between `user` and `skill`.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `skill_id` | uuid | Yes | — | No | FK → `skill.id` | Skill the action targeted |
| `actor_id` | uuid | No | `null` | No | FK → `user.id` | User who performed the action; `null` if that user was later removed |
| `action` | enum | Yes | — | No | `submit`\|`resubmit`\|`edit`\|`publish`\|`reject`\|`feature`\|`unfeature`\|`unpublish` | What happened — see [enum reference](#review_actionaction) |
| `from_status` | enum | No | `null` | No | same domain as `skill.status` | Skill status before the action |
| `to_status` | enum | No | `null` | No | same domain as `skill.status` | Skill status after the action |
| `reason` | string(500) | No | `null` | No | ≤ 500 chars | Free-text note (e.g. the rejection reason) |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | When the action occurred (immutable) |

---

## Entity: `refresh_token`

Server-side record for opaque refresh tokens returned by `POST /auth/login` and `POST /auth/refresh`. The raw token is shown to the client once and never stored; only its hash is persisted. Refresh rotates the token by revoking the old row and creating a new row.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `user_id` | uuid | Yes | — | No | FK → `user.id` | Token owner |
| `token_hash` | string(255) | Yes | — | Yes | deterministic SHA-256/HMAC hash of opaque random token | Lookup value; raw token is never persisted |
| `expires_at` | datetime | Yes | — | No | ISO 8601 UTC | Refresh token expiry |
| `revoked_at` | datetime | No | `null` | No | ISO 8601 UTC | Set when rotated, manually revoked, or user disabled |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | Creation time |

---

## Entity: `idempotency_key`

Replay cache for retry-safe mutating requests that accept `Idempotency-Key` (`POST /skill`, lifecycle actions, and department assignment). Keys are scoped to the authenticated user. Reusing the same key with the same request fingerprint returns the stored response; reusing it with a different fingerprint returns `IDEMPOTENCY_KEY_CONFLICT`.

| Field | Type | Required | Default | Unique | Constraints / Range | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | Yes | generated | Yes (PK) | UUID v4 | Primary key |
| `user_id` | uuid | Yes | — | No | FK → `user.id` | Authenticated caller that owns the key |
| `key` | string(80) | Yes | — | Yes (with `user_id`) | client-generated UUID/string | Idempotency key value from the request header |
| `request_fingerprint` | string(64) | Yes | — | No | SHA-256 hex | Hash of method + path + canonical body |
| `response_status` | int | Yes | — | No | 200–599 | Stored HTTP status for replay |
| `response_body` | json | No | `null` | No | success or error envelope | Stored response body for replay; `null` only for `204` |
| `expires_at` | datetime | Yes | — | No | ISO 8601 UTC | Replay window expiry; recommended default 24h |
| `created_at` | datetime | Yes | `now()` | No | ISO 8601 UTC | First time the key was accepted |

Primary unique key = (`user_id`, `key`).

---

## Foreign Keys & Cascade Rules

| Child column | References | On Delete | On Update | Rationale |
| --- | --- | --- | --- | --- |
| `skill.owner_id` | `user.id` | `RESTRICT` | N/A | Preserve authorship; a user who owns skills cannot be hard-deleted — disable via `is_active` instead |
| `skill.category_id` | `category.id` | `RESTRICT` | N/A | A category still referenced by a skill cannot be deleted |
| `skill_tag.skill_id` | `skill.id` | `CASCADE` | N/A | Tag links are meaningless without their skill — remove them with it |
| `skill_tag.tag_id` | `tag.id` | `CASCADE` | N/A | Deleting a tag removes all of its skill links |
| `review_action.skill_id` | `skill.id` | `CASCADE` | N/A | Audit rows are removed when the skill is hard-deleted |
| `review_action.actor_id` | `user.id` | `SET NULL` | N/A | Keep the audit trail even if the acting user is removed; the actor becomes anonymous |
| `user.department_id` | `department.id` | `RESTRICT` | N/A | A department still referenced by a member cannot be deleted |
| `skill_department.skill_id` | `skill.id` | `CASCADE` | N/A | Department scoping is meaningless without its skill — remove it with the skill |
| `skill_department.department_id` | `department.id` | `RESTRICT` | N/A | A department still scoping a skill cannot be deleted |
| `refresh_token.user_id` | `user.id` | `CASCADE` | N/A | A removed account cannot keep active refresh credentials |
| `idempotency_key.user_id` | `user.id` | `CASCADE` | N/A | Replay cache is caller-scoped and disposable |

`N/A` for `On Update`: all primary keys are immutable UUIDs, so referenced key values never change.

---

## Status & Enum Reference

### `user.role`

| Value | Description | Persisted |
| --- | --- | --- |
| `member` | Belongs to a department. Can submit skills, edit only their own `draft`/`rejected` records, and read `published` skills available to their department. Default for new accounts. | Yes |
| `admin` | Can review all skills, publish `pending`/`unpublished` skills, reject `pending` skills, feature/unfeature and unpublish `published` skills, manage departments and members, and assign published skills to departments. | Yes |

Unauthenticated requests are not a role and have no `user` row; they can reach only auth endpoints plus `GET /department` for registration — every catalog request requires a session.

### `skill.status`

| Value | Visible to | Description |
| --- | --- | --- |
| `draft` | owner, admin | Created but not submitted for review |
| `pending` | owner, admin | Submitted; awaiting admin decision |
| `published` | members of assigned departments (all members if org-wide), admin | Live in the member catalog and detail pages |
| `rejected` | owner, admin | Declined with `rejection_reason`; owner may edit and resubmit |
| `unpublished` | owner, admin | Previously published, withdrawn by an admin |

**Allowed transitions** (enforced in the API; an out-of-domain transition returns `INVALID_STATE_TRANSITION` — see `api.md`):

| From | To | Trigger (actor) |
| --- | --- | --- |
| `draft` | `pending` | submit (owner) |
| `pending` | `published` | publish (admin) |
| `pending` | `rejected` | reject (admin) |
| `rejected` | `pending` | resubmit (owner) |
| `published` | `unpublished` | unpublish (admin) |
| `unpublished` | `published` | publish (admin) |

`is_featured` toggles only while `status = published`; it is forced to `false` on `reject` and `unpublish`.

### `review_action.action`

| Value | Recorded when | Typical actor |
| --- | --- | --- |
| `submit` | A new skill enters `pending` | member |
| `resubmit` | A `rejected`/`draft` skill returns to `pending` | member |
| `edit` | Owner saves changes to a `draft`/`rejected` skill | member |
| `publish` | Skill becomes `published` | admin |
| `reject` | Skill becomes `rejected` (carries `reason`) | admin |
| `feature` | `is_featured` set to `true` | admin |
| `unfeature` | `is_featured` set to `false` | admin |
| `unpublish` | Skill becomes `unpublished` | admin |

---

## Index Recommendations

| Index name | Table | Column(s) | Type | Serves |
| --- | --- | --- | --- | --- |
| `user_email_uniq` | `user` | `lower(email)` | unique | Login / duplicate-email check |
| `user_role_idx` | `user` | `role` | btree | Listing admins |
| `user_department_idx` | `user` | `department_id` | btree | Members in a department |
| `category_slug_uniq` | `category` | `slug` | unique | Category page lookup |
| `category_name_uniq` | `category` | `name` | unique | Duplicate-name guard |
| `tag_slug_uniq` | `tag` | `slug` | unique | Tag page lookup |
| `tag_name_uniq` | `tag` | `name` | unique | Duplicate-name guard |
| `skill_name_uniq` | `skill` | `lower(name)` | unique | Block duplicate skill names (case-insensitive) |
| `skill_slug_uniq` | `skill` | `slug` | unique | Detail-page lookup |
| `skill_source_uniq` | `skill` | `lower(source_url)` | unique | Block duplicate source links (case-insensitive) |
| `skill_status_idx` | `skill` | `status` | btree | Review queue and catalog filtering |
| `skill_status_featured_idx` | `skill` | (`status`, `is_featured`) | btree | Catalog "featured only" listing |
| `skill_status_category_idx` | `skill` | (`status`, `category_id`) | btree | Browse published skills by category |
| `skill_owner_idx` | `skill` | `owner_id` | btree | Member "My submissions" listing |
| `skill_published_at_idx` | `skill` | `published_at DESC` | btree | "Newest" sort on the public catalog |
| `skill_search_ft` | `skill` | (`name`, `summary`) | full-text / GIN | Keyword search |
| `skill_tag_pk` | `skill_tag` | (`skill_id`, `tag_id`) | unique (PK) | Pair uniqueness / skill→tags lookup |
| `skill_tag_tag_idx` | `skill_tag` | `tag_id` | btree | "Skills by tag" reverse lookup |
| `department_slug_uniq` | `department` | `slug` | unique | Department page / lookup |
| `department_name_uniq` | `department` | `name` | unique | Duplicate-name guard |
| `skill_department_pk` | `skill_department` | (`skill_id`, `department_id`) | unique (PK) | Pair uniqueness / skill→departments lookup |
| `skill_department_dept_idx` | `skill_department` | `department_id` | btree | "Skills for a department" reverse lookup |
| `review_action_skill_idx` | `review_action` | `skill_id` | btree | Per-skill decision timeline |
| `review_action_actor_idx` | `review_action` | `actor_id` | btree | Actions performed by an admin |
| `review_action_created_idx` | `review_action` | `created_at DESC` | btree | Recent activity feed |
| `refresh_token_hash_uniq` | `refresh_token` | `token_hash` | unique | Refresh-token lookup |
| `refresh_token_user_idx` | `refresh_token` | (`user_id`, `expires_at`) | btree | Token rotation and cleanup |
| `idempotency_key_user_key_uniq` | `idempotency_key` | (`user_id`, `key`) | unique | Replay lookup / duplicate-key guard |
| `idempotency_key_expiry_idx` | `idempotency_key` | `expires_at` | btree | Expired replay-cache cleanup |

---

## Validation Notes (mirrored by the API)

- **Duplicate name** → blocked by `skill_name_uniq`; surfaced as `DUPLICATE_SKILL_NAME` (see `api.md`).
- **Duplicate source link** → blocked by `skill_source_uniq`; surfaced as `DUPLICATE_SOURCE_URL`.
- **Install command format** → must satisfy the `install_command` regex; otherwise `INVALID_INSTALL_COMMAND`.
- **Required submission fields** → `name`, `summary`, `category_id`, `install_command`, `source_url`; otherwise `VALIDATION_ERROR` with field-level `details`.
- **Refresh tokens** → raw refresh tokens are never stored. Login/refresh writes a hashed `refresh_token` row; refresh rotates by revoking the old row and creating a new one.
- **Idempotent mutating actions** → a repeated `Idempotency-Key` with the same request fingerprint replays the stored response and creates no duplicate domain rows or `review_action`. The same key with a different fingerprint returns `IDEMPOTENCY_KEY_CONFLICT`. State no-ops such as publishing an already-published skill or featuring an already-featured one return the current resource and do not append a second `review_action`.
- **Department-scoped visibility** → a `member` may read a `published` skill only when it is org-wide (no `skill_department` rows) or has a `skill_department` row matching the member's `department_id`; otherwise the API hides it (treated as not found). Admins bypass this. Only admins write `skill_department` rows or change a user's `department_id`.
- **Member registration** → `department_id` is required when creating a `member`; an admin account may have `department_id = null`. Re-assigning a department is idempotent (assigning the current department is a no-op success).
