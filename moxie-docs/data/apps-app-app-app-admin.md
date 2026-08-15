# Admin area: Supabase-backed data access clients (Admin Console, Audit, AI, Approvals)

This area contains the client-side React components that power the Admin console views. They use the shared Supabase client to query admin-oriented tables and render statistics, audit trails, AI insight health, and an intake approvals inbox.

## Architecture

- Entry points are client components under `apps/app/app/(app)/admin/**/_components/*Client.tsx` that are rendered by their respective Admin routes.
- All data access goes through `createAppClient()` from `@/lib/data/client/supabase-client` to talk to Supabase from the browser using the current session.
- UI is built with the shared design system components from `@/components/ui/*` and icons from `lucide-react`.
- Control flow is: React mount -> create Supabase client -> issue `from(...).select(...)` queries (and in one case call a server API) -> render tables/cards -> user actions trigger fetch or POSTs -> toast feedback via `sonner`.

Key modules:
- `apps/app/app/(app)/admin/_components/AdminClient.tsx` — Admin dashboard overview with counts and navigation.
- `apps/app/app/(app)/admin/audit/_components/AuditClient.tsx` — Filterable, exportable system audit log viewer.
- `apps/app/app/(app)/admin/ai/_components/AdminAIClient.tsx` — AI failures and recent insights monitor.
- `apps/app/app/(app)/admin/approvals/_components/ApprovalsClient.tsx` — Inventory intake approvals inbox with approve/reject flows.

## apps/app/app/(app)/admin/_components/AdminClient.tsx

Responsibility
- Renders the Admin Console landing with four metric cards and navigation links. Fetches record counts from Supabase for: `business_profile`, `user_roles`, `system_audit_log`, and `ai_insights_failures`.

Data loading and state
- On mount, builds a Supabase client via `createAppClient()` and concurrently runs four `select("id", { count: "exact" })` queries using `Promise.all`.
- Updates local `stats` state with the returned `count` fields (fallback to 0). Displays a loading state until finished.

Important details
- Tables queried: `business_profile`, `user_roles`, `system_audit_log`, `ai_insights_failures`.
- The UI shows version text `v0.4.12` and links to `/admin/businesses`, `/admin/users`, `/admin/audit`, `/admin/ai`.
- Errors during fetch are logged to console but do not surface a toast.

What to watch out for
- Changing table names or RLS could break count queries silently; only a console error is shown.
- The component assumes `createAppClient()` may return a falsy value; it then short-circuits to stop loading. If your client factory changes to always return a client, re-check the loading logic.

## apps/app/app/(app)/admin/audit/_components/AuditClient.tsx

Responsibility
- A client-side system audit log viewer with business filter, search, and CSV/JSON export. Pulls from `system_audit_log` and joins via an in-memory lookup to `business_profile` for display names.

Data loading and filters
- On mount and whenever `selectedBusiness` changes, runs `init()` which calls both `fetchAuditLogs()` and `fetchBusinesses()` then clears loading.
- `fetchBusinesses()` selects `id, name` from `business_profile` ordered by `name`.
- `fetchAuditLogs()` selects `*` from `system_audit_log`, ordered by `created_at` descending, limited to 500. If `selectedBusiness !== "all"` it applies `.eq("business_id", selectedBusiness)`.
- A local `searchTerm` filters the fetched logs by `action`, `entity_type`, or `user_id` (case-insensitive substring).

Rendering
- Header provides export buttons to download the currently filtered logs:
  - CSV: columns are "Timestamp", "Action", "Entity Type", "Entity ID", "User ID", "Business ID". Values are escaped and quoted; filename `audit_logs_YYYY-MM-DD.csv`.
  - JSON: pretty-printed array of the filtered log rows; filename `audit_logs_YYYY-MM-DD.json`.
- Main table shows: Timestamp (`created_at`), Action (badge, underscores replaced by space for display), Target Entity (`entity_type`, `entity_id`), Actor (`user_id` or "System"), Business/Tenant (lookup of `business_id` to `business_profile.name` with fallback to raw `business_id` or `-`), and a Details column that conditionally shows a modal-like details panel with `old_values` and `new_values` JSON.

Error handling and UX
- Failures in fetching logs trigger `toast.error("Failed to load audit logs")` and console error logging. Business list failures log to console only.
- Loading shows a spinner. An empty state row is rendered when no records match filters.

What to watch out for
- The component requests `*` from `system_audit_log`. If sensitive columns exist, ensure RLS or view-layer security matches expectations since this runs client-side.
- The details panel renders potentially large JSON payloads; very large values will increase memory and layout cost.
- Business filter relies on client-side list; ensure `business_profile` is accessible in the current session context.

## apps/app/app/(app)/admin/ai/_components/AdminAIClient.tsx

Responsibility
- Displays a summary and tabular views of AI pipeline health: recent failures from `ai_insights_failures` and recent insights from `ai_insights`.

Data loading
- On mount, creates a Supabase client and calls `fetchData()`.
- `fetchData()` concurrently queries:
  - `ai_insights_failures`: `select("*")`, ordered by `created_at` desc, `limit(100)`.
  - `ai_insights`: `select("*")`, ordered by `created_at` desc, `limit(50)`.
- Errors in either query raise `toast.error("Failed to load AI data")` and are logged; `loading` is cleared in `finally`.

Rendering
- Summary cards: "Total Failures" (destructive accent) and "Total Insights" showing lengths of loaded arrays.
- Failures table columns: Timestamp (`created_at`), Function (`function_name`), Business ID (first 8 chars with ellipsis; `-` if null), Error Message (`error_message` with truncate), Details (optional expandable `error_stack`).
- Insights table columns: Created (`created_at` date), Type (`insight_type`), Title (`insight_title`), Priority (`priority` with color coding for `critical`, `high`, `medium`, default gray), Status (`status`).

What to watch out for
- Assumes the current user/session has read access to both `ai_insights_failures` and `ai_insights` with `select("*")` from the client; validate RLS.
- The UI simply counts array lengths; it is not a true total across pages. If you need total counts, add `{ count: "exact" }` or server-side aggregation.

## apps/app/app/(app)/admin/approvals/_components/ApprovalsClient.tsx

Responsibility
- Admin approval inbox for inventory intake records. Loads pending intakes, displays details, and supports Approve (with or without edits) and Reject actions. Also shows a history tab of the last 20 processed items.

Data model and joins
- Source table: `inventory_intakes`.
- The component uses PostgREST embed syntax to join:
  - `inventory:inventory_id (product_name, sku, unit_of_measure)`
  - `submitter:created_by (email)`
- Local `IntakeRequest` shape normalizes joined fields into:
  - `product_name`, `sku`, `unit_of_measure` from `inventory`
  - `created_by_email` from `submitter.email`

Data loading
- `fetchIntakes()` loads both:
  - Pending: `.eq("status", "pending").order("created_at", { ascending: false })` with the joins above.
  - History: `.in("status", ["approved", "rejected"]).order("updated_at", { ascending: false }).limit(20)` with the same joins.
- After fetching, a `transform` maps joined fields into the flattened structure with fallbacks: `product_name || "Unknown"`, `sku || "N/A"`, `unit_of_measure || "g"`, `created_by_email || "Unknown"`.
- Errors toast `"Failed to load approval queue"` and log to console. A Refresh button calls `fetchIntakes`.

Actions and side effects
- Approve (direct): calls `handleApprove(false)`.
- Edit & Approve: opens an edit modal prefilled from the selected intake, then `handleApprove(true)` sends override values.
- Reject: opens a reject dialog, then `handleReject()` sends reason.

HTTP interactions
- Both approve and reject POST to a server API endpoint at `/api/inventory/intake/approve` with `Content-Type: application/json`. This file is not included here; its contract is inferred from usage.

Requests
- Approve without edits body:
  - `{ intake_id: string, action: "approve" }`
- Approve with edits body:
  - `{ intake_id: string, action: "approve", override_values: { total_cost: number, total_weight_grams: number, delivery_cost: number, supplier: string } }`
- Reject body:
  - `{ intake_id: string, action: "reject", rejection_reason: string }`

Responses
- Expects JSON. On non-2xx, the code reads `{ error }` and throws an Error with that message. On success, it expects `{ message }` for approve, and uses a fixed toast "Intake rejected" for reject.
- Status codes are not explicitly checked beyond `res.ok`.

Rendering and calculations
- Pending list renders per-intake cards with:
  - Total Cost (`total_cost`) formatted via `formatCurrency`.
  - Quantity Received: `total_weight_grams` plus `unit_of_measure`.
  - Cost Per Unit: `calculated_cost_per_gram` displayed as currency per `unit_of_measure`.
  - Supplier string, and submitter email/date using `created_by_email` and `created_at`.
- History tab renders compact cards showing `total_cost`, `total_weight_grams`+`unit_of_measure`, and `created_at` date, with status badge `Approved` (green) or `Rejected` (destructive).

Modals
- Edit & Approve dialog manages `editValues` with controlled numeric inputs for `total_cost`, `total_weight_grams`, and `delivery_cost`, plus supplier; it passes numbers in `override_values` by `Number(...)`/`parseFloat(...)`.
- Reject dialog captures `rejection_reason` and resets it on success.

What to watch out for
- This component mixes Supabase client queries with a custom server API for state transitions. Keep server endpoint semantics aligned with the client’s expectations: JSON body, `{ error }` on failure, `{ message }` on success for approve.
- Numeric parsing: empty strings become `0` for `total_cost`. Ensure the server validates against accidental zeroes.
- RLS for `inventory_intakes` must allow the session to read pending and history records with the specified joins.
- The history query limits to 20; changes to pagination expectations should update the UI accordingly.

## Gotchas
- Client-side Supabase access: All components query with `select("*")` or joined columns directly from the browser. Ensure RLS policies are correct for admin users; otherwise, queries will error or return empty without much surface indication besides a toast in some views.
- Falsy Supabase client: Each component guards against `!supabase`. If `createAppClient()` changes to always return a client or throw on failure, audit loading and error paths.
- Large payloads: `AuditClient` can render large `old_values`/`new_values` and `AdminAIClient` may render large `error_stack`. Consider truncation or virtualization if tables grow.
- Count vs list lengths: `AdminClient` uses `count: "exact"` server-side; `AdminAIClient` uses client-array lengths from limited queries. Don’t confuse those numbers when comparing views.
- Endpoint coupling: `ApprovalsClient` is tightly coupled to `/api/inventory/intake/approve` semantics. If that endpoint changes its route, body, or response shape/status, approvals will break; update both sides together.