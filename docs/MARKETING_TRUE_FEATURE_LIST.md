# DRX Marketing True Feature List

Status: Active  
Owner: DRX Marketing + Product Engineering  
Last Updated: 2026-03-04

## Canonical Voice

DRX

Deelrx CRM. Built for operators who run real businesses.

DRX is a fast, no-nonsense POS and customer system made for independent dispensaries and street-smart entrepreneurs. It keeps sales tight, inventory accurate, and teams accountable without corporate-software friction.

No bloated menus.  
No complicated setup.  
No enterprise energy.

Just tools that help operators sell, track, and grow.

## Claim Status Rubric

- `Live`: Verifiable in current product workflows and/or tests.
- `Beta`: Partially implemented, limited surface, or implementation is present but still constrained.
- `Planned`: Intentional future direction, not currently shippable as a broad claim.

## What DRX Does

### Fast Point of Sale

Status: `Live` (refund tracking phrasing: `Beta`)

- Clean, fast checkout screen.
- Barcode scanning.
- Quick product search.
- Easy discounts.
- Multiple payment types.
- Customer lookup at checkout.
- Refund tracking. (`Beta`)
- Transaction history.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/sale/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/payment/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/components/quick-pos/product-search.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/tests/e2e/quick-pos-flow.spec.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/sales/[id]/page.tsx`

### Quick POS Mode

Status: `Live`

- Scan product.
- Adjust quantity.
- Apply discount.
- Take payment.
- Done.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/sale/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/payment/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/complete/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/tests/quick-pos/payment-idempotency.test.tsx`

### Inventory That Actually Makes Sense

Status: `Live` (purchase-order tracking wording: `Beta`)

- Live stock counts.
- Low stock alerts.
- SKU and barcode support.
- Batch tracking.
- Vendor tracking.
- Purchase order tracking. (`Beta`)
- Cost and profit visibility.
- Clear logs when inventory is adjusted.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/inventory/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/inventory/intake/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/inventory/audit/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/insights/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/utils/inventory-engine.ts`

### Customer Tracking That Works

Status: `Live` (notes/tags + loyalty support wording: `Beta`)

- Customer profiles.
- Purchase history.
- Notes and tags. (`Beta`)
- Loyalty tracking support. (`Beta`)
- Basic customer insights.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/customers/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/customers/[id]/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/credit/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/utils/pos-weight-engine.ts`

### Real Business Reports

Status: `Live` (downloadable/deep report slices wording: `Beta`)

- Daily, weekly, monthly sales reports.
- Best-selling products.
- Sales by category.
- Revenue tracking.
- Downloadable reports. (`Beta`)
- Simple dashboard overview.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/dashboard/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/insights/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/reports/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/dashboard/operator/page.tsx`

### Team Control & Accountability

Status: `Live`

- Admin, Manager, and Operator roles.
- Custom access levels.
- Track who processes refunds.
- Track who adjusts inventory.
- Secure login system.
- Activity logs by user.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/team/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/auth/permissions.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/middleware.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/admin/audit-logs/route.ts`

### Multi-Location Ready

Status: `Beta`

- Separate store views.
- Location-based reporting.
- Central admin access.
- Clean separation between storefronts.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/workspaces/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/admin/businesses/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/admin/businesses/route.ts`

### Works on Desktop and Mobile

Status: `Live`

- Full dashboard on desktop.
- Mobile-friendly checkout.
- Cloud-based access.
- Log in from anywhere.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/dashboard/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/sale/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(operator)/pos/payment/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/mobile`

## DRX Privacy ProteXion™

Powered by DRX Intelligence™  
Protected by DRX Privacy ProteXion™

Most POS and CRM tools collect too much and keep it forever.  
DRX does the opposite.

Core principle: `collect less data and protect the rest.`

### Alias-First Customer Tracking

Status: `Live`

- DRX does not require real names or personal information.
- Track customers with aliases like `Big Mike`, `Blue Honda`, or `VIP 23`.
- Nearly every CRM field is optional.
- Optional fields include phone number, email address, address, and notes.
- Operators can run transactions without attaching a customer profile.
- Goal: collect only what you actually need.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/pos/customers/quick-create/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/customers/[id]/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/components/quick-pos/customer-inline.tsx`

### Privacy Profiles

Status: `Live`

- Operators choose privacy mode during onboarding and can change it anytime.
- Alias Mode (Maximum Privacy): nickname-only tracking, no personal info required.
- Standard Mode: light customer tracking with optional contact details.
- Business CRM Mode: full CRM behavior for teams that choose to collect more.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/components/onboarding/steps/PrivacyStep.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/profiles.ts`

### Strong Encryption

Status: `Live`

- Sensitive customer fields are encrypted.
- If someone got database access, encrypted sensitive values stay unreadable without keys.
- Encrypted fields include phone numbers, emails, addresses, and notes.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/crypto.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/customers/[id]/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/pos/customers/quick-create/route.ts`

### DRX Vault Mode™

Status: `Live`

- Unlock keys are controlled by the operator environment.
- Keys are not stored in the database.
- This adds another protection layer around sensitive customer records.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/crypto.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/privacy/vault-status/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/page.tsx`

### Minimal Data Engine

Status: `Live`

- DRX shows how much personal data exists, so teams can keep a small data footprint.
- Built-in counts include aliases, phone numbers, emails, addresses, and notes.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/inventory.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/privacy/inventory/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/privacy/inventory/refresh/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/page.tsx`

### ProteXion Mode

Status: `Live`

- DRX can hide customer details on screen when privacy matters.
- Example:
- Normal View: `Alias: Big Mike`, `Phone: 404-555-9811`
- ProteXion Mode: `Alias: B*** M***`, `Phone: Hidden`

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/masking.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/api/privacy/protexion/preferences/route.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/tests/privacy/masking.unit.test.ts`

### Ephemeral Customer Profiles

Status: `Live`

- DRX supports temporary customer records with auto-delete windows.
- Supported windows include 24 hours, 7 days, and 30 days.
- Fits one-time customers and quick POS scenarios.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/profiles.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/tests/integration/customers-ephemeral.test.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/tests/integration/pos-quick-create-ephemeral.test.ts`

### Data Retention Controls

Status: `Live`

- Operators control how long customer data stays in the system.
- DRX can remove inactive records after a selected retention window.
- No unnecessary data sitting around forever.

Evidence pointers:
- `/Users/lee/Projects/DRX_Primary/apps/app/lib/privacy/profiles.ts`
- `/Users/lee/Projects/DRX_Primary/apps/app/app/(app)/settings/page.tsx`
- `/Users/lee/Projects/DRX_Primary/apps/app/tests/integration/privacy-cleanup-ephemeral.test.ts`

Closing statement:

Most systems collect everything and keep it forever.  
DRX collects less, protects what exists, and lets you stay in control.

Powered by DRX Intelligence™  
Protected by DRX Privacy ProteXion™

## Why DRX Exists

Most POS systems are built for corporations with layers of managers and meetings about meetings.

DRX is built for operators who:

- Run lean.
- Move fast.
- Want clarity without confusion.
- Need structure without corporate headaches.
- Care about privacy and control.

It is built for real storefront energy.

Simple. Fast. In control.
