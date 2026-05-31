# DRX Feature Audit (Codebase Source of Truth)

Generated from:
- `apps/app/app/**` routes and pages
- `apps/app/app/api/**` handlers
- `apps/app/lib/**` auth/permissions/help hooks
- `apps/app/db/schema/**` and `apps/app/db/migrations/**`
- `apps/app/components/**` UI workflows

Audit date: 2026-04-02  
Auditor: Codex (execution run)

## Scope Audited
- App routing and layouts: `apps/app/app/(app)/*`, `apps/app/app/(operator)/*`, public auth/onboarding pages
- APIs: POS, inventory, customers, credit, reports, team, admin, featurebase auth, tenant delete
- Role and permissions logic: `apps/app/lib/auth/permissions.ts`, `apps/app/lib/hooks/use-permission.ts`, `apps/app/lib/hooks/use-user-role.ts`
- Data model: inventory, customers, sales, credit, delivery, AI recommendation/forecast, audit tables
- Help surfaces: in-app task guides + Featurebase embed wiring

## End-User Route Inventory

### Public / Entry
- `/` -> redirects to `/dashboard`
- `/login`, `/register`
- `/waitlist`
- `/onboarding`
- `/pricing`
- `/contact`

### Core Authenticated
- `/dashboard`
- `/sales`
- `/sales/[id]`
- `/pos` -> redirects `/pos/sale`
- `/pos/sale`
- `/pos/payment`
- `/pos/complete`
- `/inventory`
- `/inventory/intake`
- `/inventory/adjust`
- `/inventory/audit`
- `/customers`
- `/customers/[id]`
- `/credit`
- `/insights`
- `/reports`
- `/settings`
- `/settings/profile`
- `/settings/team`
- `/settings/inventory/aliases`
- `/workspaces`
- `/ai-intelligence`
- `/help`
- `/help/start`
- `/help/sell`
- `/help/operations`
- `/help/troubleshoot`
- `/help/library`

### Admin Surfaces
- `/admin`
- `/admin/businesses`
- `/admin/users`
- `/admin/audit`
- `/admin/ai`
- `/admin/features`
- `/admin/approvals`

## API Surface (Customer-Visible Workflows)
- POS: `/api/pos/bootstrap`, `/api/pos/products`, `/api/pos/checkout`, `/api/pos/checkout-enhanced`, `/api/pos/validate-stock`, `/api/pos/validate-credit`, `/api/pos/customers/*`
- Inventory: `/api/inventory`, `/api/inventory/intake`, `/api/inventory/intake/approve`, `/api/inventory/adjust`
- Customers: `/api/customers`, `/api/customers/[id]`
- Credit: `/api/credit/customers`, `/api/credit/transactions`, `/api/credit/exposure-report`, `/api/credit/intelligence/front-approval`, refresh endpoints
- Reports: `/api/reports/pos-baseline`, `/api/reports/pos-reconciliation`
- Team: `/api/team`, `/api/team/members/*`
- Business settings/profile: `/api/business/profile`, `/api/business/settings`
- Featurebase auth JWT: `/api/featurebase/auth`
- Tenant RTBF delete flow: `/api/v1/tenant/[tenantId]/user/[userId]/delete`

## Role / Access Matrix (Observed)

Observed role values across app:
- `cashier`, `supervisor`, `manager`, `super_admin`, `owner`, `admin`, `staff`

Primary permission model in use:
- UI checks often use `usePermission` fallback matrix with strings like `users.manage`, `settings.manage`, `sales.view_all`
- Auth module also defines typed permissions like `staff.manage`, `settings.configure_pos`, `reports.view_all`

Risk:
- Permission naming is not fully normalized across hooks/components (`settings.manage` vs `settings.configure_pos`, `users.manage` vs `staff.manage`), so rendered access can diverge.

Practical access intent from code:
- Cashier/staff: POS + basic customer/catalog access
- Supervisor: cashier + void/discount + daily reporting + customer manage
- Manager/admin/owner: supervisor + inventory + all reports + team/settings
- Super admin: global/admin tooling and feature controls

## Feature Inventory

## 1) Quick POS (Primary cashier path)
- Feature name: Quick POS checkout
- Route/location: `/pos/sale`, `/pos/payment`, `/pos/complete`
- Summary: Fast cart flow using bootstrap favorites/recents, product search/scan, inline customer attach, and payment completion.
- Roles access: Intended for cashier/supervisor/manager via sales permissions.
- Key steps:
  1. Load register bootstrap from `/api/pos/bootstrap`
  2. Add items from favorites/recent/search/manual price
  3. Attach customer if needed (credit context)
  4. Continue to payment and finalize checkout endpoint
- Settings/dependencies: Business context, POS tax/business settings, inventory availability.
- Data entities: `inventory`, `sales`, `sales_line_items`, customer links, payment fields.
- Constraints/gotchas:
  - Out-of-stock items blocked at add time.
  - Search failures produce “Search unavailable”.
  - Requires business context; no business routes users to onboarding.
- Existing article status: Present in legacy docs but steps are partly outdated.
- Accuracy: Weak / partially outdated.

## 2) Sales Console (legacy/full POS shell)
- Route/location: `/sales`, `/sales/[id]`
- Summary: Full sales console with AI pricing widget, customer/cart controls, fees, delivery, review, and sale detail editing.
- Roles access: manager-heavy capabilities; price override gated by manager role.
- Key steps:
  1. Build cart from inventory search
  2. Optional weighted entry, delivery, fees, customer attach
  3. Redirect users to `/pos` for primary checkout path
  4. In sale detail, managers can edit payment method/ref and reassign customer
- Dependencies: delivery options, AI recommendations, tax settings.
- Data entities: `sales`, `sales_line_items`, `delivery_management`, `ai_pricing_recommendations`, customer loyalty fields.
- Constraints/gotchas:
  - Page copy explicitly says live cashier checkout moved to `/pos`.
  - Credit customer reassignment restricted to manager/owner.
- Existing article status: Present but mixed with old route names.
- Accuracy: Outdated.

## 3) Inventory Hub
- Route/location: `/inventory`
- Summary: Product listing, search, create/edit dialog, and operation launchers for intake/adjust/audit.
- Roles access: inventory-manage users.
- Key steps: add product, edit product metadata, jump to intake/adjust/audit.
- Dependencies: active business.
- Data entities: `inventory`.
- Constraints/gotchas: Missing business blocks workflow.
- Existing article status: Present but incomplete.
- Accuracy: Weak.

## 4) Inventory Intake
- Route/location: `/inventory/intake`
- Summary: Logs incoming stock with cost and weight, computes cost/gram, and can require approval.
- Roles access: `inventory.manage` guard.
- Key steps:
  1. Select product
  2. Enter total cost, total weight, optional delivery cost and supplier
  3. Confirm intake
  4. Process via `/api/inventory/intake`
- Dependencies: product exists, business context, intake approval logic.
- Data entities: `inventory_intakes`, `inventory`, logs.
- Constraints/gotchas:
  - minimum weight/cost checks
  - may return `requires_approval`.
- Existing article status: sparse/legacy.
- Accuracy: Missing detail.

## 5) Inventory Adjustment
- Route/location: `/inventory/adjust`
- Summary: Correct stock counts using set/add/remove operations with required reason.
- Roles access: `inventory.manage` guard.
- Key steps: choose product -> choose action -> quantity -> reason -> submit.
- Data entities: `inventory`, `inventory_log`.
- Constraints/gotchas: value must be positive; remove translates to negative delta.
- Existing article status: limited.
- Accuracy: Weak.

## 6) Inventory Audit Log
- Route/location: `/inventory/audit`
- Summary: Time-ordered inventory change history with type, product, quantity change, reason, actor.
- Roles access: `audit.view` guard.
- Key steps: view/filter recent records, review discrepancy trail.
- Data entities: `inventory_log` joined with inventory/user references.
- Constraints/gotchas: user join can degrade to “System”.
- Existing article status: mostly missing.
- Accuracy: Missing.

## 7) Customers
- Route/location: `/customers`, `/customers/[id]`
- Summary: Create/edit customer profiles, search, and view customer-level details.
- Roles access: customer view/manage permission levels.
- Key steps:
  1. Search existing customers
  2. Add/edit with validation
  3. Ensure contactability (phone or email required)
- Dependencies: business context, schema validation.
- Data entities: `customers`, links to sales/credit.
- Constraints/gotchas:
  - requires phone OR email
  - formatted phone normalization in form.
- Existing article status: present, but generic.
- Accuracy: Weak.

## 8) Credit Management (fronts/balances)
- Route/location: `/credit`
- Summary: Track customer balances, aging buckets, extensions, payments, and exposure.
- Roles access: manager/supervisor workflows depending on permission mapping.
- Key steps:
  1. Review aging + limits
  2. Extend credit (front)
  3. Record payment
  4. Monitor recent credit transactions
- Dependencies: credit RPC helpers and limits per customer.
- Data entities: `credit_limits`, `credit_transactions`, customer totals.
- Constraints/gotchas:
  - payment cannot exceed balance
  - extension can fail if over max limit.
- Existing article status: present but partially stale terms.
- Accuracy: Weak/outdated.

## 9) Reports
- Route/location: `/reports`
- Summary: POS baseline and reconciliation visibility with CSV export and discrepancy codes.
- Roles access: report permissions.
- Key steps:
  1. View date window totals (today/week/previous week)
  2. Inspect low stock/top products/recent margin
  3. Review reconciliation health
  4. Export reconciliation CSV
- Dependencies: auth context resolver, report calculators.
- Data entities: sales ledger + cost allocations + reconciliation outputs.
- Constraints/gotchas:
  - no business/auth context shows sign-in prompt.
- Existing article status: minimal.
- Accuracy: Missing.

## 10) Dashboard (operator presets)
- Route/location: `/dashboard`
- Summary: Preset-based dashboard (`operations`, `checkout`, `inventory`) with alerts, quick actions, pinned panel, and activity feed.
- Roles access: authenticated users with business context.
- Key steps: choose preset (onboarding/settings), monitor alerts, run quick actions.
- Dependencies: dashboard preferences + business context.
- Data entities: sales, inventory, customer, alert counts.
- Constraints/gotchas: no business -> onboarding empty state.
- Existing article status: weak.
- Accuracy: Missing detail.

## 11) AI Intelligence Center
- Route/location: `/ai-intelligence`
- Summary: Product-level AI analysis for pricing and forecast plus dashboard overview.
- Roles access: operational/manager roles (not explicitly hard-gated in page).
- Key steps:
  1. Search product
  2. Trigger per-item analysis via `/api/ai/product-intelligence`
  3. Optionally trigger batch via `/api/ai/analyze`
- Dependencies: AI endpoints, inventory data.
- Data entities: recommendation/forecast objects.
- Constraints/gotchas: API errors surfaced as toast failures.
- Existing article status: mostly missing.
- Accuracy: Missing.

## 12) Settings (business + tax + manager pin)
- Route/location: `/settings`
- Summary: Business profile fields, tax collection toggle/rate, and POS manager PIN.
- Roles access: settings/manage permissions; additional links gated.
- Key steps: edit profile -> edit tax/PIN -> save profile + settings APIs.
- Data entities: `business_profile`, `business_settings`.
- Constraints/gotchas:
  - two-step API save (profile then settings)
  - field variants map snake_case/camelCase.
- Existing article status: weak.
- Accuracy: Outdated.

## 13) Team Management
- Route/location: `/settings/team`
- Summary: View team members and update role assignments.
- Roles access: `users.manage` in current hook path.
- Key steps: fetch team via `/api/team`; role change via direct table update.
- Data entities: `user_roles`, business membership.
- Constraints/gotchas:
  - Owner role not editable in dropdown.
  - Permission string mismatch risk (`users.manage` vs typed permission enums).
- Existing article status: thin.
- Accuracy: Weak.

## 14) Inventory Aliases
- Route/location: `/settings/inventory/aliases`
- Summary: Manage product unit nicknames (aliases), enable/disable, restore defaults.
- Roles access: inventory managers.
- Key steps: add alias, toggle alias, delete alias, restore seeded defaults.
- Data entities: `product_unit_aliases`.
- Constraints/gotchas: duplicate alias constraint returns db unique error.
- Existing article status: present in legacy docs but inconsistent with current UI.
- Accuracy: Outdated.

## 15) Workspaces / Tenant Isolation
- Route/location: `/workspaces`
- Summary: Business tenant switcher UI with role/privacy/failsafe messaging and isolation guidance.
- Roles access: authenticated users with multiple business memberships.
- Key steps: select workspace -> switch business context.
- Dependencies: `useBusiness` available businesses.
- Data entities: business membership context.
- Constraints/gotchas: content includes some compliance/failsafe claims that are mostly informational and not fully backed by explicit setting UIs.
- Existing article status: largely missing.
- Accuracy: Missing.

## 16) Help Center + Knowledge Library
- Route/location: `/help/*`, `/help/library`
- Summary: task-first guides plus Featurebase embed filtered by topic tags.
- Roles access: authenticated users.
- Key steps: choose task, follow checklist, open library embed, fallback to troubleshoot.
- Dependencies: Featurebase org/app config + SDK script + JWT endpoint.
- Data entities: external Featurebase content.
- Constraints/gotchas:
  - Env lacks visible Featurebase app/org vars in audited env files.
  - Embed fallback messaging already present.
- Existing article status: exists in-app; external library uncertain.
- Accuracy: partial.

## 17) Admin Console
- Route/location: `/admin/*`
- Summary: manage businesses/users/audit logs/AI failures/feature flags.
- Roles access: super-admin/owner/manager depending on API checks.
- Key steps: inspect cards, manage users/roles, toggle feature flags.
- Dependencies: admin tables + supabase access.
- Data entities: `admin_users`, `user_roles`, `system_audit_log`, `feature_flags`.
- Constraints/gotchas:
  - no single centralized server-side gate in pages; enforcement split between middleware, actions, API checks.
- Existing article status: mostly undocumented for customers.
- Accuracy: Missing/should be scoped by audience.

## 18) RTBF / Permanent User Deletion
- Route/location: `POST /api/v1/tenant/[tenantId]/user/[userId]/delete` + admin users UI
- Summary: owner/super-admin initiated deletion path with audit logging and Clerk hard-delete attempt.
- Roles access: only owner/super_admin for tenant.
- Key steps:
  1. Role check
  2. Audit log `rtbf_initiated`
  3. Delete identity provider user
  4. Remove tenant roles
  5. Audit log `rtbf_completed`
- Dependencies: Clerk API + db access.
- Data entities: `user_roles`, `system_audit_log`.
- Constraints/gotchas:
  - 404 from Clerk tolerated as already-deleted case.
- Existing article status: under-documented.
- Accuracy: Missing.

## Undocumented or Under-Documented Shipped Features
- Quick POS separated flow (`/pos/*`) vs legacy `/sales`
- Reconciliation report and CSV export
- Intake approval behavior (`requires_approval`)
- Inventory audit trail screen
- Workspace switching and tenant isolation flow
- RTBF user deletion path
- AI intelligence per-product analysis and batch analysis
- Delivery option + amount paid capture in enhanced POS flow

## Ghost Docs / Mismatch List
- Legacy help content references older route names and generic “mobile-only” assumptions while app is route-grouped web with POS-specific subroutes.
- Legacy “Owner/Manager/Staff” simplification does not fully reflect active role set (`cashier`, `supervisor`, `manager`, `owner`, `admin`, `super_admin`, `staff`).
- Legacy setup docs imply a single settings path for privacy presets; current UI has onboarding privacy language and workspace guidance but no clearly exposed dedicated privacy preset settings page in audited routes.

## Key Risks For Documentation Accuracy
- Permission naming drift across modules can cause role behavior mismatch.
- Some compliance/failsafe marketing language appears in UI copy without direct setting surfaces visible in audited routes.
- Featurebase content sync depends on credentials not present in checked env files.

