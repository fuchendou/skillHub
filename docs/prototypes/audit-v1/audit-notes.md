# Skill Hub v1 Prototype UI Audit

Audit date: 2026-06-16

Scope: screenshot-based critique of `docs/prototypes/version/prototypes-v1.html` for preparing a production-quality prototype image. This audit is only about the prototype UI and visual/product direction; it does not request or imply production implementation changes.

## Evidence Captured

1. `01-login.png` - login screen. Health: structurally clear, but demo controls are mixed into the product surface.
2. `02-member-catalog.png` - member catalog, desktop. Health: usable catalog shape, but prototype controls and explanatory text pollute the production read.
3. `03-member-detail.png` - member skill detail, desktop. Health: core install information is present; page title and language are too admin/review-oriented for members.
4. `04-member-submit.png` - member submission form, desktop. Health: strongest screen in the prototype; form and "what happens next" rail are clear.
5. `05-admin-dashboard.png` - admin dashboard, desktop. Health: operationally useful, but publish/reject actions are too immediate for a serious review workflow.
6. `06-admin-queue.png` - admin review queue, desktop. Health: good queue foundation; needs stronger prioritization and safer action hierarchy.
7. `07-admin-review-detail.png` - admin review detail, desktop. Health: has the right ingredients, but decision evidence is too thin.
8. `08-admin-departments.png` - department management, desktop. Health: explains counts, but does not visualize the actual access-control model well enough.
9. `09-mobile-member-catalog.png` - member catalog immediately after login, mobile. Health: poor; navigation, demo switcher, and toast consume the first screen.
10. `10-mobile-member-catalog-after-toast.png` - member catalog after toast clears, mobile. Health: still poor; actual catalog content remains below the fold.

## What Works

- The core product direction is correct: this feels more like an internal command center than a public marketplace.
- Role-aware navigation is legible. Member and admin workspaces visibly reshape around different jobs.
- The member submission form has a good production pattern: primary form on the left, process reassurance on the right.
- The catalog cards keep to fields the data model actually supports: name, summary, category, owner, status, featured, install action.
- The admin queue already communicates lifecycle states and risk labels, which is the right trust model for v1.

## High-Priority Problems

1. Prototype scaffolding is visible inside product screens.

The `Data state` switcher, `Design fit` explanation, and `Demo: switch account` control are helpful for reviewing a coded prototype, but they should not appear in a production prototype image. They make the UI feel like a demo harness instead of a believable internal product.

Recommended direction: move prototype controls outside the product canvas, or make two versions: `review prototype` with controls and `production mock` without controls.

2. Member detail and admin review share too much language.

The member detail screen is titled `Submission Review`, even when the user's job is simply to decide whether to install a published skill. This confuses the mental model: members need trust, use cases, install command, and source clarity; admins need evidence, risk, lifecycle actions, and audit history.

Recommended direction: split the screen vocabulary:

- Member: `Skill Detail`, `Install`, `Source`, `Available to`, `Usage notes`, `Submitted by`.
- Admin: `Review Submission`, `Decision`, `Risk checks`, `Reviewer notes`, `History`, `Department visibility`.

3. Admin publish/reject actions are too exposed in list rows.

On the dashboard and queue, `Publish` and `Reject` sit directly beside `Review`. For a serious internal review product, this makes high-impact decisions look like lightweight row actions. It also weakens the value of the detail/review page.

Recommended direction: make `Review` the dominant row action. Keep quick publish only for low-risk records after an explicit "reviewed" signal, or move publish/reject into the detail decision panel.

4. The admin review detail lacks enough decision evidence.

The detail view repeats submitted fields and gives a generic reviewer note: "Command format passes..." For a production prototype, the decision panel should show the checks that justify action.

Recommended direction: add a compact evidence checklist:

- Command format: passed/failed.
- Source link: reachable/unverified.
- Duplicate check: none found / possible duplicate.
- Department impact: org-wide or scoped.
- Submitter history or previous rejection reason when relevant.

5. Department management explains access in prose, not interaction.

The department page lists member and skill counts, but the important concept is "which departments can see which published skills." Counts alone do not help admins reason about scope or mistakes.

Recommended direction: add a department-skill visibility matrix or a "visibility preview" panel. The production prototype should make org-wide vs scoped access visually obvious.

6. Mobile layout is not production-ready.

At 390px wide, the sidebar becomes a large top block and pushes the catalog below the fold. Even after the toast disappears, the user still has not reached the first skill card. The demo switcher worsens this, but the layout problem remains.

Recommended direction: mobile should use a compact top app bar, account menu, and drawer navigation. The first mobile screen should show the page title, search, and at least one catalog result or clear empty state.

7. Visual hierarchy is clear but slightly over-carded.

Almost every object is a card with border and shadow. This works for a prototype, but a production internal tool should reserve cards for records, decision panels, and forms. Too many framed surfaces reduce scan speed.

Recommended direction: flatten the page background and reduce shadows. Use bands/sections for page structure; keep cards for skill rows, review records, and side panels.

8. The color system is useful but too evenly distributed.

Cyan, lime, violet, amber, and red are all present, but status severity is not always sharp. `Featured`, `Low risk`, `Published`, `Admin role`, and controls compete for attention.

Recommended direction: make semantic color stricter:

- Red/amber only for risk and destructive/blocked states.
- Green/teal for safe/published/success.
- Neutral gray for metadata tags.
- Featured can be a subtle accent, not a competing primary badge.

## Production Prototype Directions

1. Create a clean production canvas.

Remove data-state controls, design-fit copy, demo account switcher, and demo login shortcuts from the mock intended for stakeholders. Keep them only in an internal prototype control layer.

2. Make the first screen role-specific.

Member first screen: department-scoped catalog with search and visible first results.

Admin first screen: review queue with pending risk triage, not broad dashboard metrics unless those metrics directly guide review action.

3. Strengthen the catalog as an operational list.

For v1, a dense list/table hybrid may be more credible than large cards. Show skill name, summary, category, owner, status/featured, department scope, and primary action. Cards are fine if there are few skills, but the product's purpose suggests repeat scanning.

4. Reframe the member detail page around trust and installation.

Recommended layout:

- Header: skill name, status, featured if any, category.
- Primary rail: install command, copy, open source.
- Body: summary, usage notes, submitted by, available to, last updated.
- Optional trust block: reviewed by admin, source checked, duplicate status.

5. Reframe admin review around evidence before action.

Recommended layout:

- Left: submitted metadata.
- Center or top: risk/evidence checklist.
- Right sticky rail: decision panel with publish/reject.
- Bottom: review-action history and prior rejection reason if relevant.

6. Make department scoping visual.

Add either:

- a per-skill department assignment matrix in admin detail, or
- a department page with "visible skills" drill-down and org-wide count separated from scoped count.

7. Design explicit empty/loading/error production states without debug controls.

The prototype includes these states, but they are accessed through a visible debug switch. Production prototype images should show state variants as separate frames: `Catalog - Loaded`, `Catalog - Empty`, `Catalog - Error`, etc.

8. Redesign mobile from scratch, not by stacking desktop.

Use a top bar, bottom nav or drawer, sticky search, and compact result rows. Hide account and role details behind a menu. Keep the first task visible above the fold.

## Accessibility Risks From Screenshot Review

- Focus order and keyboard access were not fully verified from screenshots. Buttons and native fields are visible, but focus management for modals, toasts, and role switching still needs testing.
- The toast is assertive and visually large; on mobile it can obscure the main task after sign-in.
- Some small metadata text and sidebar helper text may be low contrast, especially muted blue-gray on dark sidebar or pale badges.
- Badge-heavy rows may be noisy for screen-reader users unless status, risk, and category are semantically grouped.
- Icon-only or icon-leading controls need robust labels in the real implementation; screenshots alone cannot prove accessible names.

## Recommended Next Prototype Pass

Make a production-image version of the prototype with these frames:

1. Member catalog, desktop, clean production canvas.
2. Member skill detail, desktop, install/trust focused.
3. Member submit form, desktop, lightly polished from current version.
4. Admin review queue, desktop, Review-first action hierarchy.
5. Admin review detail, desktop, evidence checklist plus decision rail.
6. Admin department visibility, desktop, matrix or visibility preview.
7. Member catalog, mobile, redesigned top-bar/drawer layout.

