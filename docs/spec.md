## 1. Target Users

Skill Hub is an **internal company tool**. There is no anonymous catalog access — everyone signs in before browsing, submitting, or reviewing skills. The only unauthenticated screens/endpoints are login, registration, token refresh, and the department list needed to render the registration form.

- **Members** (employees)
  - Must sign in; registration is required to get an account.
  - Belong to exactly one department, chosen at registration.
  - Browse and search the published skills available to their department.
  - Open skill detail pages to understand purpose, metadata, trust signals, and installation instructions.
  - Copy a skill install command or follow a source/reference link.
  - Submit new skills for admin review and manage only their own draft or rejected submissions.

- **Admins**
  - Review submitted skills before they become available to members.
  - Publish, reject, unpublish, or feature skills.
  - Assign each published skill to one or more departments, or leave it org-wide (available to all departments).
  - Manage departments and members (a member's department, role, and active state).
  - Keep the catalog clean, deduplicated, and safe enough for a basic launch.

## 2. Core Flows

- **Account flow**
  - A new employee registers with email, display name, password, and their department.
  - Registration creates a member account; the member then signs in.
  - An initial admin account is seeded so the catalog can be curated from first run.
  - Unauthenticated people can reach only the login and register screens.

- **Member discovery flow** (after sign-in)
  - Member signs in and lands on the catalog scoped to their department.
  - Member searches or browses by category, tag, status badge, or featured list.
  - Member opens a published skill detail page that is available to their department.
  - Member copies the install command or opens the source/reference link.
  - Member receives clear feedback when the copy action succeeds or fails.

- **Member submission flow**
  - Member signs in.
  - Member opens the submission form.
  - Member enters required skill metadata: name, short description, category, tags, install command, source/reference link, and longer usage notes.
  - System validates empty fields, duplicate skill names or source links, and invalid install command format.
  - Valid submission enters a pending review state.

- **Admin review and curation flow**
  - Admin signs in.
  - Admin opens the review queue.
  - Admin reviews pending submissions with submitter, metadata, install command, and source/reference link visible.
  - Admin publishes, rejects with a reason, or marks a published skill as featured.
  - Admin assigns each published skill to one or more departments, or leaves it org-wide.
  - Published skills become visible to members of the assigned departments; rejected skills remain visible only to the submitting member and admins.

## 3. Non-goals

- No anonymous or public browsing — all catalog access requires sign-in.
- No paid marketplace, checkout, subscriptions, or revenue sharing.
- No user reviews, comments, ratings, or community forum in v1.
- No tutorial/news/community portal sections.
- No skill execution, hosted runtime, or online trial environment.
- No complex ranking algorithm; featured ordering can be manually curated by admins.
- No skill stacks, bundles, or learning paths.
- No advanced semantic search; basic keyword, category, tag, and status filtering is enough.
- No multi-agent compatibility matrix beyond simple text metadata if provided.
- No public API, analytics dashboard, or export system.
- No SSO/directory sync in v1; email + password registration is enough.
- No member self-publishing without admin review.

## 4. Key States

- **Authentication state**
  - Logged-out: can reach only the login and register screens; no catalog access.
  - Logged-in member: sees published skills available to their department plus their own submissions; can submit and manage their own non-public submissions.
  - Logged-in admin: can review and manage all skill records, departments, and members.

- **Skill lifecycle state**
  - Draft: member-owned, not yet submitted. The owner may edit it and submit it for review.
  - Pending review: submitted by a member, visible to the submitting member and admins only.
  - Published: approved by an admin from `pending` (or restored from `unpublished`), visible to members of the departments the skill is assigned to (or all departments when org-wide), in search, browse, and detail pages.
  - Rejected: declined by an admin from `pending`, visible to the submitting member and admins only, with rejection reason. The owner may edit and resubmit it.
  - Unpublished: previously published and hidden from the member catalog by admin action; admins may restore it by publishing it again.

- **Skill visibility state** (applies to published skills)
  - Org-wide: assigned to no specific department; available to all members.
  - Department-scoped: assigned to one or more departments; visible only to members of those departments (and to admins).

- **Discovery state**
  - Initial catalog with the department-scoped published and optionally featured skills.
  - Search/filter results.
  - No-results state with a clear reset option.
  - Loading state while catalog or detail data is being fetched.
  - Error state when data cannot be loaded.

- **Submission state**
  - Empty form.
  - Invalid form with field-level validation feedback.
  - Duplicate skill warning.
  - Submit in progress.
  - Submit success leading to pending review.
  - Submit failure with retry option.

- **Action state**
  - Copy install command idle, success, and failure.
  - Publish/reject/feature/assign action idle, in progress, success, and failure.
  - Duplicate clicks should not create duplicate submissions or repeated admin actions.

## 5. Permission Boundaries

- Unauthenticated users can reach only login, register, token-refresh, and the public department-list endpoint/screen support needed for registration; every catalog read or write requires a valid session.
- Members can read a published skill only when it is assigned to their department or is org-wide; a member always sees their own submissions regardless of status.
- Members can create skills and edit only their own drafts or rejected submissions.
- Members cannot publish, feature, unpublish, edit another member's skill, or change a skill's department assignment.
- Members cannot make a skill available without admin approval.
- Admins can view all skills, publish `pending` or `unpublished` skills, reject `pending` skills with a reason, feature/unfeature `published` skills, unpublish `published` skills, and assign any `published` skill to departments.
- Only admins manage departments and member records (role, department, active state).
- Admin-only actions must not be exposed through member-only interfaces.
- Draft, pending, rejected, and unpublished skills must not appear in member search, browse lists, featured sections, or detail pages.
- A published skill must not appear to a member whose department is not in the skill's department assignment, unless the skill is org-wide.
- Ownership checks must happen on every member edit or resubmission action.
- Submit/resubmit/publish/reject/feature/unfeature/unpublish/assign actions must be idempotent enough to handle double-clicks or repeated requests safely.

## 6. Acceptance Criteria

- A new employee can register with email, display name, password, and a department, and then sign in.
- An unauthenticated person is redirected to the login screen and cannot reach any catalog page.
- A seeded initial admin can sign in on first run without any manual database editing.
- A member can sign in and see only published skills available to their department (department-scoped or org-wide).
- A member can search those skills by keyword.
- A member can browse or filter those skills by category and tag.
- A member can distinguish featured or trusted skills when admins mark them.
- A member can open a skill detail page for a skill available to their department.
- A skill detail page shows name, description, category, tags, submitter/publisher name, status badge if any, install command, source/reference link, and usage notes.
- A member can copy the install command from a skill detail page and receive success or failure feedback.
- Empty search results show a clear no-results message and a way to reset the query or filters.
- Skill detail load failures show a clear error state instead of a broken page.
- A member can submit a skill with required metadata.
- Empty required submission fields are blocked with clear validation feedback.
- Duplicate skill submissions are blocked or clearly flagged before review.
- Invalid install commands are blocked or clearly flagged before review.
- A valid member submission enters pending review and is not visible to other members.
- A member can view and edit only their own draft or rejected submissions.
- An admin can sign in and view pending submissions.
- An admin can publish a pending skill.
- An admin can assign a published skill to one or more departments, or leave it org-wide.
- A published skill immediately becomes visible to members of its assigned departments in search, browse, and detail views, and stays hidden from members of other departments.
- An admin can reject a pending skill with a reason.
- A rejected skill remains hidden from other members and visible to the member who submitted it.
- An admin can mark a published skill as featured or remove the featured mark.
- An admin can create and manage departments and assign members to departments.
- Double-clicking submit, publish, reject, copy, feature, or assign actions does not create duplicate records or conflicting states.
- The v1 deliverable is considered done when login/registration, the department-scoped catalog, skill detail, member submission, admin review, publish/reject, department assignment, basic curation, validation, empty states, loading states, and error states all work end to end.

## 7. Resolved v1 Product Decisions

- Authentication is email + password. Login returns a short-lived JWT access token and an opaque refresh token; SSO/directory sync is post-v1.
- Member registration is open self-service for v1 and requires a valid `department_id` from the public department list.
- A newly published skill with no department assignments is org-wide. Admins may later restrict it to one or more departments.
- Valid install commands must match the documented regex in `schema.md` and `api.md`: `codex|claude|gemini|opencode` + `skill install|skill add` + `owner/name`-style package path.
- Members may edit only `draft` or `rejected` skills. Edits to already published skills are out of scope for v1.
- Required skill metadata is `name`, `summary`, `category_id`, `install_command`, and `source_url`; tags and usage notes are optional.
- Unpublished skills are restorable by admins through the publish action. Hard delete remains available only for admins and owner-owned drafts.

## 8. Post-v1 Questions

- Should self-service registration later be restricted by invite or email-domain allowlist?
- Should published-skill edits later create a new pending-review revision instead of being out of scope?
- Should the metadata model later add version, license, compatibility, or maintainer fields?
