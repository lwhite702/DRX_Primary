# DeelRxCRM – Product Requirements Document

## 1. Product Overview

DeelRxCRM is a mobile-first CRM, POS, and inventory management system designed for regulated, inventory-driven small businesses.

The product prioritizes:

- Financial accuracy
- Inventory traceability
- Role-based accountability
- Operational speed on mobile devices
- Auditability over abstraction

The system is built to support real-world workflows where mistakes cost money, compliance matters, and staff turnover is common.

---

## 2. Target Users and Roles

### Primary Roles

- Cashier

  - Executes sales
  - Views products and customers
  - Cannot modify pricing rules, tax settings, or inventory costs

- Supervisor

  - All Cashier permissions
  - Can override prices within defined bounds
  - Can void transactions
  - Can adjust inventory quantities with audit logging

- Manager

  - All Supervisor permissions
  - Can manage products, pricing rules, and tax settings
  - Can manage customers and suppliers
  - Can view reports and analytics

- Super Admin
  - Full system access
  - Manages businesses, users, permissions, and global settings
  - Access to audit logs and system diagnostics

Permissions are enforced server-side and must never rely on UI-only gating.

---

## 3. Core Functional Areas

### 3.1 POS (Point of Sale)

- Fast transaction flow optimized for touch and mobile
- Supports:
  - Fractional quantity sales (.25, .5, weight-based units)
  - Price overrides with role validation
  - Tax-inclusive and tax-exclusive pricing
  - Tax disabled per business
- All sales generate immutable transaction records

No sale may be altered after completion. Corrections require voids or refunds.

---

### 3.2 Inventory Management

- Inventory is tracked by:
  - Quantity
  - Weight
  - Cost per unit
- Intake process records:
  - Total cost
  - Total weight
  - Delivery cost as a separate line item
- Cost per unit is derived, not manually entered

Historical inventory data must remain immutable. Adjustments are logged as new records.

---

### 3.3 Pricing and Tax Logic

- Pricing logic must be deterministic and reproducible
- Tax rules:
  - Configurable per business
  - Applied per line item
  - Never retroactively recalculated
- Rounding rules must be explicit and consistent

Financial correctness takes priority over UX convenience.

---

### 3.4 Customers and CRM

- Customers may be created with:
  - First name only
  - Alias support
  - Either phone or email, not both required
- Customer profiles aggregate:
  - Purchase history
  - Notes
  - Status flags
- No customer deletion. Soft-disable only.

---

### 3.5 Reporting and Auditability

- Reports include:
  - Sales
  - Inventory movement
  - Tax summaries
  - User actions
- All sensitive actions generate audit logs:
  - Price overrides
  - Inventory adjustments
  - Voids and refunds
  - Permission changes

Audit logs are append-only.

---

## 4. Non-Goals

- No consumer-facing ecommerce
- No accounting system replacement
- No speculative AI automation without guardrails

---

## 5. Success Criteria

- Zero silent data mutation
- Zero unlogged financial changes
- Mobile POS usable with one hand
- New staff can complete a sale in under 2 minutes
- Historical data remains trustworthy

---

## 6. Constraints

- Supabase is the backend of record
- Role enforcement must exist at the database level
- No mock data in production paths
- Open source libraries preferred for non-differentiating features
