# Admin and Credit data access clients (Supabase + hooks)

This area contains client-side admin console components and a credit manager hook that read and mutate data via Supabase and an internal credit system. It exists to surface admin metrics, audit trails, approval workflows, and credit operations from the browser.

## Architecture

- Entry points are client components/hooks used by pages under `(app)/admin` and `(app)/credit`:
  - apps/app/app/(app)/admin/_components/AdminClient.tsx
  - apps/app/app/(app)/admin/audit/_components/AuditClient.tsx
  - apps/app/app/(app)/admin/approvals/_components/ApprovalsClient.tsx
  - apps/app/app/(app)/credit/_hooks/useCreditManager.ts
- Data access is through `createAppClient()` which returns a Supabase client bound to the current session. All selects/filters assume RLS grants appropriate tenant-scoped access.
- The approvals UI also posts to an internal API route at `/api/inventory/intake/approve` to transition inventory intake status.
- The credit manager hook mixes Supabase reads with actions delegated to `creditSystem` utility methods that encapsulate business logic and server I/O.

## apps/app/app/(app)/admin/_components/AdminClient.tsx

Renders the Admin Console dashboard tiles and summary counts. It fetches four totals concurrently on mount and links to deeper admin areas.

Behavior
- Creates a Supabase client via `createAppClient()`.
- On mount, performs four count-only selects using `select("id", { count: "exact" })`:
  - `business_profile`
  - `user_roles`
  - `system_audit_log`
  - `ai_insights_failures`
- Populates local `stats` state with the returned `count` values, defaulting to 0 if undefined.
- Shows a simple “Loading...” state while fetching; then renders cards linking to `/admin/businesses`, `/admin/users`, `/admin/audit`, and `/admin/ai`.

Notable details
- Version string displayed: `v0.4.12`.
- A missing Supabase client short-circuits loading and renders immediately.
- Uses display-only counts; no pagination or caching is applied.

Side effects and dependencies
- Supabase read access to the four tables is required and must be permitted by RLS for the current session.

## apps/app/app/(app)/admin/audit/_components/AuditClient.tsx

Lists system audit records with business filtering, free-text search, and CSV/JSON export.

Behavior and data flow
- Creates Supabase client via `createAppClient()`.
- On mount and whenever `selectedBusiness` changes, concurrently loads:
  - Businesses: `from("business_profile").select("id, name").order("name")`
  - Logs: `from("system_audit_log").select("*").order("created_at", { ascending: false }).limit(500)`; optionally filters by `business_id` when `selectedBusiness !== "all"`.
- Maintains local state for `auditLogs`, `businesses`, `selectedBusiness`, `searchTerm`, and `loading`.
- Client-side filters logs by checking if `action`, `entity_type`, or `user_id` include the `searchTerm` (case-insensitive).
- Exports either CSV or JSON of the filtered logs by generating a Blob and programmatically clicking an `<a>` with `download`.

UI and rendering
- Top toolbar provides search input, a business filter `<Select>`, and a record count `<Badge>`.
- Main table shows: Timestamp, Action, Target Entity (type + id), Actor (user_id), Business/Tenant (resolved to business name if present), and Details.
- Details column conditionally shows a disclosure with pretty-printed `old_values` and/or `new_values` JSON payloads inside a modal-like `details` overlay with close button.

Errors and toasts
- Business fetch errors are logged to console.
- Audit log fetch errors trigger `toast.error("Failed to load audit logs")`.
- Export with empty result triggers `toast.error("No logs to export")`; success triggers `toast.success(...)`.

Contracts and assumptions
- Tables used: `business_profile` and `system_audit_log` with fields such as `id`, `created_at`, `action`, `entity_type`, `entity_id`, `user_id`, `business_id`, `old_values`, `new_values`.
- RLS must scope both tables to the current tenant. The client performs an optional `eq("business_id", ...)` filter; if RLS already restricts to a tenant, selecting “All Businesses” will still only show what RLS allows.

## apps/app/app/(app)/admin/approvals/_components/ApprovalsClient.tsx

Displays and manages an “Approval Inbox” for inventory intake records, supporting approve (with or without edits) and reject flows, plus a short history view.

Data loading
- Supabase client via `createAppClient()`.
- `fetchIntakes()` loads:
  - Pending: `from("inventory_intakes").select("*, inventory:inventory_id (product_name, sku, unit_of_measure), submitter:created_by (email)").eq("status", "pending").order("created_at", { ascending: false })`
  - History: same select but `.in("status", ["approved", "rejected"]).order("updated_at", { ascending: false }).limit(20)`
- Transforms each row to flatten joins into the local `IntakeRequest` shape with `product_name`, `sku`, `unit_of_measure`, and `created_by_email`.

Actions and side effects
- Approve (direct): posts to `/api/inventory/intake/approve` with body `{ intake_id, action: "approve" }`.
- Edit & Approve: opens a dialog letting the reviewer edit `total_cost`, `total_weight_grams`, `delivery_cost`, and `supplier`. Posts `{ intake_id, action: "approve", override_values: { ... } }` to the same endpoint.
- Reject: posts to `/api/inventory/intake/approve` with `{ intake_id, action: "reject", rejection_reason }`.
- All POSTs use `Content-Type: application/json`, parse the JSON response, throw on non-OK, show toast on success/error, and refresh the queues.

UI structure
- Tabs with “Pending” and “History”. Pending renders cards with key fields and actions; History shows the last 20 processed intakes with status badges.
- Uses `formatCurrency` for monetary display and shows unit of measure inline.

Contracts
- Server-side API route `/api/inventory/intake/approve` must accept the bodies as constructed above and return JSON containing `message` on success or `{ error }` on failure, with HTTP status signaling `res.ok`.
- Supabase tables/columns referenced: `inventory_intakes` joins to `inventory` via `inventory_id` (for `product_name`, `sku`, `unit_of_measure`), `created_by` via `submitter:created_by (email)`, and has fields such as `id`, `total_cost`, `total_weight_grams`, `calculated_cost_per_gram`, `delivery_cost`, `supplier`, `created_at`, `status`.

## apps/app/app/(app)/credit/_hooks/useCreditManager.ts

A React hook that centralizes reads for customers, credit limits, aging data, and recent credit transactions for a business, and exposes handlers to extend credit or record payments.

Inputs and state
- Input: `businessId: string | undefined`.
- State: `customers`, `creditLimits` (Map keyed by `customer_id`), `agingData`, `transactions`, `loading`, plus dialog toggles `showExtensionDialog` and `showPaymentDialog`.

Data fetching
- Supabase client via `createAppClient()`.
- `fetchCustomers()` selects active, non-ephemeral customers for the business:
  - `from("customers").select("id, first_name, last_name").eq("business_id", businessId).eq("is_active", true).eq("ephemeral", false).order("first_name")`
- `fetchCreditLimits()` loads limits:
  - `from("credit_limits").select("customer_id, max_credit_limit, current_balance").eq("business_id", businessId)`
  - Builds a `Map<string, CreditLimit>` indexed by `customer_id`.
- `fetchAgingData()` delegates to `creditSystem.getCreditAging(businessId)` and, on `result.success`, stores `result.data` as `AgingData[]`.
- `fetchTransactions()` loads recent credit transactions with customer details:
  - `from("credit_transactions").select("*, customers(first_name, last_name)").order("created_at", { ascending: false }).limit(50)`

Lifecycle and refresh
- `refreshData()` runs all four fetchers in parallel and toggles `loading`.
- `useEffect` triggers `refreshData()` whenever `businessId` becomes truthy.

Actions
- `handleExtension({ customer_id, amount, notes?, due_date? })` calls `creditSystem.extendCredit(businessId, customer_id, amount, notes || "", due_date || new Date().toISOString())`. On success, toasts and refreshes; on error, toasts the `result.error`.
- `handlePayment({ customer_id, amount, notes? })` calls `creditSystem.processPayment(businessId, customer_id, amount, notes || "")` with analogous success/error handling.

Outputs
- Returns an object exposing state, dialog setters, action handlers, and `refreshData` for use in UI components.

Contracts and dependencies
- Requires Supabase RLS to allow tenant-scoped reads on `customers`, `credit_limits`, and `credit_transactions` for the given `businessId`.
- Relies on `creditSystem` utility to perform server-side mutations and to compute aging; its methods must return `{ success: boolean, data?: any, error?: string }` as consumed by the hook.

## Gotchas

- Supabase client may be unavailable in some render contexts; all components guard on a falsy `supabase` and either short-circuit loading or return early. Ensure `createAppClient()` is configured correctly for client components.
- RLS/authorization: All selects assume the current session can read rows within the tenant. If counts or lists unexpectedly return 0, check RLS policies and session context rather than the UI.
- Audit export escapes quotes by doubling them in CSV. If you ingest the CSV downstream, ensure your parser handles RFC 4180-style quoting.
- Approvals flow depends on the internal route `/api/inventory/intake/approve`. Any change to that route’s expected body shape or response contract will break approve/reject actions. Keep `override_values` field names aligned with the DB columns the server expects to overwrite.
- Credit transactions query orders by `created_at` and is not filtered by `businessId` in the query itself; ensure RLS or a future filter constrains results to the correct tenant to avoid data leakage.
- The audit table filters and search are entirely client-side after an initial limit of 500. For larger datasets or stricter access controls, move filtering server-side or increase/decrease the limit thoughtfully.