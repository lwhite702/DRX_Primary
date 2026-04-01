# Database Overview (DRX Beta Baseline)

## Purpose

This document is the beta "DB truth artifact" for DRX. Prisma remains the schema source of truth, but this file provides a stable human-readable overview to reduce drift.

Primary schema source:

- `/Users/lee/Projects/DRX_Primary/apps/app/prisma/schema.prisma`

## Scope Model (Tenant / Business / Location)

DRX is currently business-scoped in the Prisma schema and POS/reporting queries.

- `BusinessProfile` is the primary tenant/business record (`business_profile` table)
- `User.tenantId` references `BusinessProfile.id`
- Operational tables (inventory, customers, sales, credit, etc.) use `businessId` as the tenant scope key
- POS contract supports optional `locationId` (`apps/app/lib/pos/contract.ts`) for future multi-location routing; baseline persistence/querying is business-scoped unless a location dimension is added

## Core Tables (Beta Launch)

### Auth / Identity / Access

- `business_profile` (`BusinessProfile`)
  - Tenant/business root record
  - Includes `clerk_org_id` unique mapping
- `users` (`User`)
  - Clerk-linked user records (`clerk_user_id` unique)
  - Tenant/business membership via `tenant_id`
- `invites` (`Invite`)
  - Invite tokens and status, scoped by `tenant_id`
- `user_roles` (`UserRole`)
  - Role assignments used by RBAC flows

### POS / Inventory / Sales

- `inventory` (`Inventory`)
  - Product catalog and on-hand stock
  - Includes `sku`, pricing, and `reorder_level` (used for low-stock reporting)
- `inventory_log` (`InventoryLog`)
  - Stock movement / audit trail for adjustments and transactions
- `sales` (`Sales`)
  - Checkout header (order number, payment method, totals, status)
- `sales_line_items` (`SalesLineItem`)
  - Line-level sale items tied to `sales` and optionally `inventory`

### Customers / Credit

- `customers` (`Customers`)
  - Customer profiles scoped by `business_id`
- `customer_notes` (`CustomerNote`)
  - Notes linked to customers
- `credit_transactions` (`CreditTransaction`)
  - Credits/payments/balances history
- `credit_limits` (`CreditLimit`)
  - Per-customer credit limits and current balances

### Notifications / Audit / Analytics Support

- `notification` (`Notification`)
- `system_audit_log` (`SystemAuditLog`)
- `inventory_alert` (`InventoryAlert`)
- `inventory_forecast` (`InventoryForecast`)
- `sales_velocity_cache` (`SalesVelocityCache`)
  - Cached analytics helper by business + inventory

## Explicit Uniqueness and Indexes (from Prisma)

### Explicit indexes

- `users(tenant_id)`
- `users(email)`
- `invites(tenant_id)`
- `invites(email)`
- `invites(token)`

### Explicit unique constraints

- `business_profile(clerk_org_id)`
- `users(clerk_user_id)`
- `users(email)`
- `inventory(business_id, sku)`
- `sales(business_id, order_number)`
- `sales_velocity_cache(business_id, inventory_id)`

## Tenant Scoping Rules (Operational)

These rules should hold for app code, API routes, and reports:

- Every POS query/mutation must resolve current business context before touching `inventory`, `sales`, `sales_line_items`, `customers`, or credit tables
- Reports must filter by `businessId` at minimum; `locationId` is optional and only valid when the underlying table/query supports it
- Cross-business joins or lookups by globally unique IDs alone are not sufficient unless the business scope is also enforced
- Receipt and checkout payloads should carry POS scope (`tenantId`, `businessId`, optional `locationId`) via the shared POS contract where applicable

## Current Reporting Baseline (Implemented)

The beta baseline report module is:

- `/Users/lee/Projects/DRX_Primary/apps/app/lib/reports/pos-baseline.ts`

It provides tenant/business-scoped metrics for:

- Today sales
- Week sales
- Top products
- Low-stock list
- Recent activity/sales snapshots used in dashboard views

## Drift Prevention Rules

When changing schema or tenant scoping behavior:

1. Update Prisma schema and migrations first
2. Update this document in the same PR when table/index/scope assumptions change
3. Update any shared contracts (`apps/app/lib/pos/contract.ts`) and report queries in the same PR if API payloads/scoping change
