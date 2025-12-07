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

## Changelog

## [Unreleased] - 2025-12-06

### Added - Inventory Intake System Redesign

**Complete cost tracking and automatic unit cost calculation**

- **Database Schema**

  - New `inventory_intakes` table with comprehensive cost structure
  - New `cost_history` table for tracking cost changes over time
  - Added `metadata` JSONB column to `inventory_log` for delivery cost tracking
  - Helper functions: `is_manager()` and `get_avg_cost_per_gram()`
  - RLS policies and performance indexes for new tables

- **Backend APIs**

  - `POST /api/inventory/intake` - Process inventory intakes with automatic cost calculation
  - `POST /api/inventory/intake/approve` - Manager approval workflow for unusual costs
  - Automatic cost-per-gram calculation: `total_cost / total_weight_grams`
  - Unusual cost detection (>50% deviation triggers manager approval)
  - Dual ledger entries (product cost + delivery cost tracked separately)

- **Intake UI**

  - Redesigned intake form with new cost structure fields
  - Real-time cost-per-gram calculation display
  - Separate delivery/shipping cost input (NOT included in unit cost)
  - Confirmation modal with complete cost breakdown
  - Warning system for unusual cost values
  - Auto-calculated cost per gram with 6 decimal precision

- **AI Pricing Integration**
  - Updated `PricingFactors` interface to include delivery cost history
  - Enhanced pricing logic to factor delivery cost trends
  - Delivery cost treated as separate overhead (not inflating unit cost)

### Changed

- Inventory intake workflow now requires total cost and total weight instead of unit cost
- Cost per gram automatically calculated and stored in cost history
- Delivery costs tracked separately from product costs

### Technical Details

- Migration: `20251207000001_inventory_intake_cost_tracking.sql`
- Weight precision: minimum 0.01 grams
- Cost precision: 6 decimal places for cost-per-gram
- Manager approval threshold: 50% deviation from 90-day average

Conventions

Tags: `[fix]`, `[feature]`, `[refactor]`, `[risk]`, `[pos]`, `[inventory]`, `[credit]`, `[reporting]`, `[security]`, `[db]`

Format: `[tag] YYYY-MM-DD HH:MM ET — Description`
