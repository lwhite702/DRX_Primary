# DRX Marketing True Feature List

Status: Active  
Owner: DRX Marketing + Product Engineering  
Last Updated: 2026-03-03

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
- `apps/app/app/(operator)/pos/sale/page.tsx`
- `apps/app/app/(operator)/pos/payment/page.tsx`
- `apps/app/components/quick-pos/product-search.tsx`
- `apps/app/tests/e2e/quick-pos-flow.spec.ts`
- `apps/app/app/(app)/sales/[id]/page.tsx`

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
