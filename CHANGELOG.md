# DRX Changelog

All notable changes to DRX will be documented in this file.

## [Unreleased] - Production Hardening Branch

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
