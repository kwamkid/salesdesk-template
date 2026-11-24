@AGENTS.md

# SalesDesk

Sales system for a housing developer: leads and follow-ups, plots and site plan, documents, Meta events, dashboard and exports. Built as a course template; owners with no coding background extend it with Claude Code.

Stack: Next.js (App Router) on Vercel · Supabase (Postgres, Auth, Storage, Realtime) · cron-job.org for schedules. No AI API inside the app.

## Read first

- `docs/DESIGN.md` — menus per role, theme, PWA and push, technical rules. Read it before building any page.
- `supabase/migrations/` — the database, in file-number order. The schema is the source of truth for table and column names. Every list, filter and total already has an RPC there; use it instead of writing a new query.
- `docs/steps/` — one file per page the students build: `1.13-leads.md` (customer list, add lead, customer page, activities) · `1.14-today.md` ("งานของฉันวันนี้") · `2.1-unit-import.md` (import plots from Excel). Students ask in plain words ("ทำหน้าลีดให้หน่อย", "อยากได้หน้างานวันนี้", "ทำหน้านำเข้าแปลง"): open the matching file, read only it, build only what it asks, and say in one line which file you followed.
- `docs/guides/` — setup guides for people (Supabase, Google login, Vercel, notifications, Meta). Point the user to them instead of re-explaining.
- `docs/SPEC.md` — what the system does, in business terms.

## What is already built (reuse, never rebuild)

- Login with Google only, 3 roles, invite links, approval: `src/app/(auth)`, `src/app/auth/callback`, `src/app/invite`, `/users`, `/queue`.
- Plots and site plan with realtime status: `/plots`, `/projects`, `/projects/[id]`.
- Dashboard, team, exports: `/overview`, `/team`, `/reports`, `src/app/api/export/[kind]`.
- Documents from company templates: `src/documents/` (one file per document), `/documents/[leadId]/[docKey]`.
- Settings (company, Meta, campaigns, lost reasons, documents per stage): `/settings`.
- Notifications, PWA, cron: `/notifications`, `/me`, `src/lib/push.ts`, `src/app/api/cron/*`, `public/sw.js`.
- Meta Conversions API: `src/lib/meta.ts`. Lead intake from the project website: `POST /api/leads`.
- Drop-in parts for the customer page: `src/components/lead/` (LeadUnits, VisitCheckIn, DocumentsButton, LoanScreeningCard, ActivityPhoto).
- After a Server Action that adds a lead, logs an activity, changes a stage or reserves a plot, call `afterLeadChange()` from `@/lib/background`.

Pages that show "หน้านี้ยังไม่ได้สร้าง" (NotBuiltYet) are placeholders the students build from `docs/steps/`.

## Rules

1. All user-facing text is Thai. Code and comments are English.
2. Colors, font and sizes come from `src/app/globals.css` only. Use the theme classes (`bg-brand`, `text-ink-soft`, `rounded-card`, `text-xl` ...). Never write a hex color or a pixel font size in a page.
3. Reuse `src/components/ui/` (same parts as the aoo apps; all shown on `/theme`). Add a new shared component there instead of repeating markup.
   - Basics: `button` (Button) · `field` (Field, Input, Textarea, Select) · `card` (Card, Badge, StageBadge, EmptyState, Loading, Notice, PageTitle, SectionTitle, StatTile) · `avatar`.
   - Boxes: `modal` (Modal) · `confirm-card` (Sheet, ConfirmCard) · `popover` · `tooltip` (every icon-only button) · `help-hint` (ⓘ explanations) · `image-lightbox` (every photo opens in it).
   - Lists: `data-table` (DataTable: every list table, cards on phones) · `status-tabs` (filter tabs with counts, via URL params) · `search-input` · `action-menu` (⋯ for 2+ row actions) · `collapsible-card` · `skeleton` (loading.tsx).
   - Inputs: `form-select` (FormSelect: never a native `<select>`) · `multi-select-search` · `toggle` (Toggle, ToggleRow) · `checkbox` (Checkbox, Radio) · `date-range-picker` · `time-picker` · `file-dropzone` (every upload) · `copy-field` · `chips-input` · `thai-address-input` · `sticky-action-bar` · `stepper` (Stepper, SetupSteps).
4. Mobile first. One screen, one job. Tappable things are at least 44px high (`min-h-11`). Below 768px tables become stacked cards.
5. Permissions are enforced in the database with Row Level Security on every table. Hiding a menu is not a permission.
6. Pages with several filters or totals call one Supabase RPC. Do not fetch raw rows and calculate in the browser. Long lists load 30 rows at a time.
7. Icon-only buttons need a Thai `aria-label`. Status is never shown by color alone.
8. Actions the user cannot undo alone use `ConfirmCard`, and the confirm button names the action.
9. The app name comes from `src/config/app.ts`. Stage keys come from `src/config/stages.ts`.
10. Secrets (Supabase secret key, Meta token) stay on the server. Never send them to the browser.
11. A database change is a new numbered file in `supabase/migrations/`. Never edit a file that has already been run.

## Commands

- `npm run dev` — run locally at http://localhost:3000
- `npm run build` — check before deploying
- `npm run lint`
- `node scripts/bundle-sql.mjs` — rebuild `supabase/setup.sql` (all migrations in one file) after adding a migration

## Check your work

- http://localhost:3000/setup — installation checklist
- http://localhost:3000/theme — every theme value and shared component on one page
