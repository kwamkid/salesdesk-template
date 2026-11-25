@AGENTS.md

# SalesDesk

Sales system for a housing developer: leads and follow-ups, plots and site plan, documents, Meta events, dashboard and exports. Built as a course template; owners with no coding background extend it with Claude Code.

Stack: Next.js (App Router) on Vercel · Supabase (Postgres, Auth, Storage, Realtime) · cron-job.org for schedules. No AI API inside the app.

## Read first

- `docs/DESIGN.md` — menus per role, theme, PWA and push, technical rules. Read it before building any page.
- `supabase/migrations/` — the database, in file-number order. The schema is the source of truth for table and column names. Every list, filter and total already has an RPC there; use it instead of writing a new query.
- `docs/steps/` — one file per page the students build: `1.13-leads.md` (customer list, add lead, customer page, activities) · `1.14-today.md` ("งานของฉันวันนี้") · `2.1-unit-import.md` (import plots from Excel). Students ask in plain words ("ทำหน้าลีดให้หน่อย", "อยากได้หน้างานวันนี้", "ทำหน้านำเข้าแปลง"): open the matching file, read only it, build only what it asks, and say in one line which file you followed.
- Demo data — students ask in plain words ("ใส่ข้อมูลตัวอย่างให้หน่อย", "ล้างข้อมูลตัวอย่างออก"): follow `supabase/demo/README.md`. Add: `python3 scripts/make-demo-seed.py` (dates count from today) → run `supabase/demo/seed_demo.sql` → `node scripts/upload-demo-media.mjs`. Clear: run `supabase/demo/clear_demo.sql` (removes only the 2 sample projects, their customers and the fake staff; say so and ask "ยืนยันไหม" first). Run SQL with `supabase db query --linked -f <file>` when the CLI is linked; otherwise copy the file to the clipboard (`pbcopy <` on Mac, `clip <` on Windows) and give the SQL Editor link `https://supabase.com/dashboard/project/<ref>/sql/new`.
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

0. **Central first (owner, 24 Nov 2569 — applies to every change).** Never style or build a thing page by page. Use the shared parts: classes in `src/app/globals.css` (`.lbl` field label · `.val` field value · `.link` clickable text · `.nav-progress`) and components in `src/components/ui/` (InfoList, IconButton, MemberDropdown, StatusTabs, Tabs, Pagination, DataTable, ActionIcon/Button, PlotMapPicker …). If something is needed twice and no shared part exists, create the shared class/component first, then use it everywhere it applies, and list it here.

1. All user-facing text is Thai. Code and comments are English.
2. Colors, font and sizes come from `src/app/globals.css` only. Normal text (body, table cells, values next to a label, menu and tab labels, funnel/step labels) is `text-base font-normal` (16px regular) — owner, 24 Nov 2569. Bold (`font-semibold`/`font-bold`) only for page and card titles, big numbers and buttons. A label and its value sit on one line with `items-center`. Use the theme classes (`bg-brand`, `text-ink-soft`, `rounded-card`, `text-xl` ...). Never write a hex color or a pixel font size in a page.
3. Reuse `src/components/ui/` (same parts as the aoo apps; all shown on `/theme`). Add a new shared component there instead of repeating markup.
   - Basics: `button` (Button) · `field` (Field, Input, Textarea, Select) · `card` (Card, Badge, StageBadge, EmptyState, Loading, Notice, PageTitle, SectionTitle, StatTile) · `avatar`.
   - Boxes: `modal` (Modal) · `confirm-card` (Sheet, ConfirmCard) · `popover` · `tooltip` (every icon-only button) · `help-hint` (ⓘ explanations) · `image-lightbox` (every photo opens in it).
   - Lists: `data-table` (DataTable: every list table, cards on phones) · `status-tabs` (filter tabs with counts, via URL params) · `search-input` · `action-menu` (⋯ for 2+ row actions) · `collapsible-card` · `skeleton` (loading.tsx).
   - Inputs: `form-select` (FormSelect: never a native `<select>`) · `member-dropdown` (MemberDropdown: the only staff picker, with profile pictures) · `multi-select-search` · `toggle` (Toggle, ToggleRow) · `checkbox` (Checkbox, Radio) · `date-range-picker` · `time-picker` · `file-dropzone` (every upload) · `copy-field` · `chips-input` · `thai-address-input` · `sticky-action-bar` · `stepper` (Stepper, SetupSteps).
4. Mobile first. One screen, one job. Tappable things are at least 44px high (`min-h-11`). Below 768px tables become stacked cards. A card that sits in a grid (several per row) lays out by its own width, not the screen: put `@container` on the card and use `@xl:flex-row` etc. (example: `src/components/lead/upcoming-visits.tsx`), so buttons never squeeze the text at in-between sizes.
5. Permissions are enforced in the database with Row Level Security on every table. Hiding a menu is not a permission.
6. Pages with several filters or totals call one Supabase RPC. Do not fetch raw rows and calculate in the browser. List pages use `<Pagination>` (src/components/ui/pagination.tsx, `?page=` → RPC offset, 30 rows a page). Supabase returns at most 1,000 rows per request without warning: anything that needs every row (exports, a project's plots, the team's work today) reads through `fetchAllRpc` (src/lib/fetch-all.ts).
7. Icon-only buttons need a Thai `aria-label`. Status is never shown by color alone.
8. Actions the user cannot undo alone use `ConfirmCard`, and the confirm button names the action.
   Button icons (owner, 24 Nov 2569): every "เพิ่ม…" button shows ＋, every search button a magnifier, every delete a bin — `<Button icon="add|search|delete">` or `<ActionIcon kind=… />` inside a `buttonClass()` link (src/components/ui/button.tsx). A search button is `secondary`, not the page's main colour.
9. The app name comes from `src/config/app.ts`. Stage keys come from `src/config/stages.ts`.
10. Secrets (Supabase secret key, Meta token) stay on the server. Never send them to the browser.
11. A database change is a new numbered file in `supabase/migrations/`. Never edit a file that has already been run.
12. Every navigation shows loading (owner, 24 Nov 2569): each page folder has a `loading.tsx` (PageSkeleton from `src/components/ui/skeleton.tsx`), and `NavProgress` (src/components/shell/nav-progress.tsx, mounted in the app layout) runs a top bar and dims the page for every link, tab, filter and GET form by itself. Code that moves with `router.push`/`router.replace` calls `startNav()` first. GET filter forms need `method="get"`. Picking a plot always uses `PlotMapPicker` (src/components/plots/plot-map-picker.tsx).

## Commands

- `npm run dev` — run locally at http://localhost:3000
- `npm run build` — check before deploying
- `npm run lint`
- `node scripts/bundle-sql.mjs` — rebuild `supabase/setup.sql` (all migrations in one file) after adding a migration

## Check your work

- http://localhost:3000/setup — installation checklist
- http://localhost:3000/theme — every theme value and shared component on one page
