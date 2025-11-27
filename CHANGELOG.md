# DRX Changelog

All notable changes to DRX will be documented in this file.

## [Unreleased] - Production Hardening Branch

### 2025-11-27 02:00 ET

**[feature][onboarding][ux] Added business setup wizard and help tooltips**

- Created 3-step business onboarding wizard that appears when no business exists
- Added `business_settings` table for per-business configuration (tax rate, currency, timezone)
- Created `HelpTooltip` component for contextual help throughout the app
- Added tooltips to Sales page (Customer, Payment Method, Additional Fees)
- Updated `useBusiness` hook to return `needsSetup` flag
- Created `BusinessSetupProvider` to show wizard and block app until setup complete
- Wizard auto-creates business profile, user role, and default settings

### 2025-11-21 02:45 ET

**[fix][offline][ux] Initialized offline sync manager and added status UI**

- Created `OfflineProvider` to initialize sync manager and monitor network status
- Added visual indicator for Online/Offline/Syncing states
- Implemented auto-sync on reconnection
- Updated `offlineSyncManager` to handle `fees` and `getPendingCount`
- Fixed type safety issues with IndexedDB boolean indices

### 2025-11-21 02:30 ET

**[feature][pos][db] Added configurable misc-fee support to POS checkout**

- New `fees JSONB` column on `sales` (migration `20251121_add_fees_to_sales.sql`)
- RPC `process_pos_checkout` now accepts `p_fees JSONB` and adds the total to the sale amount
- POS engine (`pos-engine.ts`) now accepts an array of `{type, amount}` and sends it to the RPC
- UI on checkout page includes a dynamic "Additional Fees" section
- Audit log now records the fees JSON for traceability

### 2025-11-21 02:18 ET

**[fix][credit][db] Fixed critical credit aging bucket calculation bug**

- Corrected SQL logic in `get_credit_aging()` function
- Buckets nowproperly calculate overdue amounts (1-7, 8-14, 15-30, 31+ days past due)
- Changed from `due_date >= CURRENT_DATE - interval` to `due_date < CURRENT_DATE` for overdue detection
- Changed JOIN to LEFT JOIN to include customers with no credit transactions
- Impact: Collection prioritization and debt tracking now accurate

### 2025-11-21 02:16 ET

**[audit] Started production hardening implementation**

- Created audit/drx-pos-inventory-production-review branch
- Beginning critical fixes for POS, inventory, and credit systems
- Focus: Financial integrity, cost tracking, offline functionality

---

## Changelog Conventions

Tags: `[fix]`, `[feature]`, `[refactor]`, `[risk]`, `[pos]`, `[inventory]`, `[credit]`, `[reporting]`, `[security]`, `[db]`

Format: `[tag] YYYY-MM-DD HH:MM ET — Description`
