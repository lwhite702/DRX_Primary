# DRX Marketing Feature Claim Matrix

Status: Active  
Owner: DRX Marketing + Product Engineering  
Last Updated: 2026-03-04

Reference source: `/Users/lee/Projects/DRX_Primary/docs/MARKETING_TRUE_FEATURE_LIST.md`

| Feature item | Status | Marketing wording allowed | Prohibited wording | Evidence path(s) |
| --- | --- | --- | --- | --- |
| Clean, fast checkout screen | Live | "Fast checkout built for line pressure" | "Instant checkout in all conditions" | `apps/app/app/(operator)/pos/sale/page.tsx` |
| Barcode scanning | Live | "Barcode scan support in Quick POS" | "Universal scanner compatibility guaranteed" | `apps/app/components/quick-pos/product-search.tsx` |
| Quick product search | Live | "Search and scan in one flow" | "Zero-latency search at all scales" | `apps/app/app/(operator)/pos/sale/page.tsx` |
| Easy discounts | Live | "Apply discounts in checkout flow" | "Any staff can discount everything" | `apps/app/lib/auth/permissions.ts` |
| Multiple payment types | Live | "Supports multiple tender types" | "All payment processors supported" | `apps/app/tests/security/security-rules.test.ts` |
| Customer lookup at checkout | Live | "Lookup customer before charge" | "Auto-identifies all customers" | `apps/app/app/(app)/sales/_components/CartCustomer.tsx` |
| Refund tracking | Beta | "Refund actions are tracked in current workflows" | "Full refund lifecycle automation" | `apps/app/app/(app)/sales/[id]/page.tsx` |
| Transaction history | Live | "Sale history is accessible and reviewable" | "Immutable forensics across all environments" | `apps/app/app/(app)/sales/[id]/page.tsx` |
| Quick POS: Scan product | Live | "Scan product in Quick POS mode" | "Auto-scans every format and hardware profile" | `apps/app/tests/e2e/quick-pos-flow.spec.ts` |
| Quick POS: Adjust quantity | Live | "Adjust quantity inline during ring-up" | "Unlimited bulk quantity optimization" | `apps/app/app/(operator)/pos/sale/page.tsx` |
| Quick POS: Apply discount | Live | "Apply discount in checkout flow" | "Any discount policy is always auto-approved" | `apps/app/app/(operator)/pos/sale/page.tsx` |
| Quick POS: Take payment | Live | "Take payment directly from Quick POS flow" | "Supports every processor and custom tender gateway" | `apps/app/app/(operator)/pos/payment/page.tsx` |
| Quick POS: Done state | Live | "Complete sale and reset for next customer" | "Guarantees zero-latency completion under all network conditions" | `apps/app/app/(operator)/pos/complete/page.tsx` |
| Live stock counts | Live | "Live stock count visibility" | "Perfect real-time sync under all outages" | `apps/app/app/(app)/inventory/page.tsx` |
| Low stock alerts | Live | "Low stock alerts in ops views" | "Predictive no-fail stockouts" | `apps/app/app/(app)/insights/page.tsx` |
| SKU and barcode support | Live | "SKU + barcode capable workflows" | "Barcode required for all products" | `apps/app/app/api/pos/products/route.ts` |
| Batch tracking | Live | "Batch-aware intake and movement tracking" | "Automated recall management" | `apps/app/app/(app)/inventory/intake/page.tsx` |
| Vendor tracking | Live | "Vendor context supported in intake flows" | "Full vendor ERP integration" | `apps/app/app/(app)/inventory/intake/page.tsx` |
| Purchase order tracking | Beta | "Purchase-order related tracking is in beta scope" | "Complete PO module is production-complete" | `apps/app/app/(app)/admin/approvals/_components/ApprovalsClient.tsx` |
| Cost and profit visibility | Live | "Cost and margin context visible in inventory flows" | "Certified accounting outputs" | `apps/app/app/(app)/inventory/intake/page.tsx` |
| Inventory adjustment logs | Live | "Adjustment actions are logged" | "Tamper-proof compliance ledger" | `apps/app/app/(app)/inventory/audit/page.tsx` |
| Customer profiles | Live | "Customer profiles with history context" | "360 profile with external enrichment" | `apps/app/app/(app)/customers/[id]/page.tsx` |
| Purchase history | Live | "Purchase history in customer workflows" | "Cross-tenant global history" | `apps/app/app/(app)/customers/[id]/page.tsx` |
| Notes and tags | Beta | "Notes/tags support is beta-scoped" | "Advanced CRM segmentation suite" | `apps/app/app/(app)/customers/[id]/page.tsx` |
| Loyalty tracking support | Beta | "Loyalty tracking support is available in current beta surfaces" | "Complete enterprise loyalty engine" | `apps/app/lib/utils/pos-weight-engine.ts` |
| Basic customer insights | Live | "Basic customer and credit insight views" | "Predictive lifecycle orchestration" | `apps/app/app/(app)/credit/page.tsx` |
| Daily/weekly/monthly sales reporting | Live | "Sales reporting windows are available" | "Custom BI studio included" | `apps/app/app/(app)/dashboard/page.tsx` |
| Best-selling products | Live | "Best-seller visibility in ops dashboards" | "Real-time market benchmark intelligence" | `apps/app/app/(app)/insights/page.tsx` |
| Sales by category | Live | "Category-level sales context is available" | "Arbitrary multidimensional cubes" | `apps/app/app/(app)/insights/page.tsx` |
| Revenue tracking | Live | "Revenue tracking built into dashboard flow" | "Guaranteed GAAP accounting output" | `apps/app/app/dashboard/operator/page.tsx` |
| Downloadable reports | Beta | "Download/report export capabilities are beta-limited" | "Complete export suite for every report" | `apps/app/app/(app)/reports/page.tsx` |
| Simple dashboard overview | Live | "Simple operational dashboard overview" | "Fully customizable dashboard builder" | `apps/app/app/(app)/dashboard/page.tsx` |
| Admin/Manager/Operator roles | Live | "Role-based access for team operations" | "Unlimited policy engine" | `apps/app/lib/auth/permissions.ts` |
| Custom access levels | Live | "Configurable access controls by role" | "Fine-grained ABAC across every entity" | `apps/app/app/(app)/settings/team/_components/TeamClient.tsx` |
| Track refund operator | Live | "Track who handled refund-related actions" | "Automated fraud adjudication" | `apps/app/app/api/admin/audit-logs/route.ts` |
| Track inventory adjustment operator | Live | "Track who changed inventory" | "Legally certified chain-of-custody" | `apps/app/app/(app)/inventory/audit/page.tsx` |
| Secure login system | Live | "Secure auth and protected app routing" | "Zero-risk auth environment" | `apps/app/middleware.ts` |
| Activity logs by user | Live | "User activity context in audit surfaces" | "Immutable WORM storage guarantee" | `apps/app/app/api/admin/audit-logs/route.ts` |
| Separate store views | Beta | "Multi-store views are beta-scoped" | "Fully isolated franchise management suite" | `apps/app/app/(app)/workspaces/page.tsx` |
| Location-based reporting | Beta | "Location-oriented reporting is beta-scoped" | "Cross-region consolidated BI with no setup" | `apps/app/app/(app)/admin/businesses/page.tsx` |
| Central admin access | Beta | "Central admin access exists for multi-business ops" | "Global HQ control plane completed" | `apps/app/app/(app)/admin/businesses/page.tsx` |
| Storefront separation | Beta | "Storefront separation is part of beta architecture" | "Hard-isolated tenancy guarantees for every deployment" | `apps/app/app/api/admin/businesses/route.ts` |
| Desktop dashboard | Live | "Full dashboard experience on desktop" | "Desktop-only advanced mode" | `apps/app/app/(app)/dashboard/page.tsx` |
| Mobile-friendly checkout | Live | "Mobile-friendly checkout workflows" | "Native offline-first mobile parity in all modules" | `apps/app/app/(operator)/pos/sale/page.tsx` |
| Cloud-based access | Live | "Cloud-hosted app access" | "Offline sync for all modules everywhere" | `apps/app/middleware.ts` |
| Login from anywhere | Live | "Authenticated cloud access from supported clients" | "Unlimited global access without policy constraints" | `apps/app/middleware.ts` |
| Alias-first tracking + optional fields + no-profile checkout | Live | "Use aliases, keep PII optional, and run checkout without forced profiles" | "Real identity is required for every sale" | `apps/app/app/api/pos/customers/quick-create/route.ts`, `apps/app/components/quick-pos/customer-inline.tsx`, `apps/app/app/api/customers/[id]/route.ts` |
| Privacy Profiles (Alias/Standard/Business CRM) | Live | "Choose privacy mode at onboarding and change it anytime" | "Privacy mode is permanent and cannot be changed" | `apps/app/components/onboarding/steps/PrivacyStep.tsx`, `apps/app/app/(app)/settings/page.tsx`, `apps/app/lib/privacy/profiles.ts` |
| Encrypted sensitive fields | Live | "Sensitive fields are encrypted and not readable without keys" | "Data is always readable to anyone with DB access" | `apps/app/lib/privacy/crypto.ts`, `apps/app/app/api/customers/[id]/route.ts`, `apps/app/app/api/pos/customers/quick-create/route.ts` |
| DRX Vault Mode keys not stored in DB | Live | "Keys are controlled in the operator environment, not stored in the database" | "Database stores plaintext keys" | `apps/app/lib/privacy/crypto.ts`, `apps/app/app/api/privacy/vault-status/route.ts` |
| Minimal Data Engine inventory counts | Live | "See counts for aliases, phones, emails, addresses, and notes" | "No visibility into stored personal data" | `apps/app/lib/privacy/inventory.ts`, `apps/app/app/api/privacy/inventory/route.ts`, `apps/app/app/(app)/settings/page.tsx` |
| ProteXion masking behavior | Live | "Mask customer details on shared screens when privacy matters" | "Masking is unavailable in operator views" | `apps/app/lib/privacy/masking.ts`, `apps/app/app/api/privacy/protexion/preferences/route.ts`, `apps/app/tests/privacy/masking.unit.test.ts` |
| Ephemeral profile windows (24h/7d/30d) | Live | "Set temporary customer profiles to auto-delete on 24h, 7d, or 30d windows" | "All customer profiles are permanent" | `apps/app/lib/privacy/profiles.ts`, `apps/app/tests/integration/customers-ephemeral.test.ts`, `apps/app/tests/integration/pos-quick-create-ephemeral.test.ts` |
| Data retention cleanup controls | Live | "Control retention windows and remove inactive records automatically" | "Records are kept forever with no cleanup controls" | `apps/app/lib/privacy/profiles.ts`, `apps/app/app/(app)/settings/page.tsx`, `apps/app/tests/integration/privacy-cleanup-ephemeral.test.ts` |

## Promotion Rule

No claim may be promoted from `Beta` or `Planned` to `Live` without:

1. Updating this matrix.
2. Adding/confirming evidence paths.
3. Updating canonical source file and marketing rendering module in the same PR.
