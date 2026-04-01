**Date:** 2026-01-31
**Scope:** End-to-end for launch (V1) with detailed owner-configurable settings, privacy controls, and core features.

---

## 0. Table of Contents

1. [Overview & Objectives](#1)
2. [Target Users & Roles](#2)
3. [Multi-Tenant Fundamentals](#3)
4. [Product Feature Domains](#4)
   - General Business Settings & Onboarding
   - Inventory Intake & Adjustments
   - POS and Transactionality
   - Product Aliases/Nicknames
   - Privacy & Data Lockdown (with Failsafes)
5. [Non-Functional & Compliance Requirements](#5)
6. [Acceptance Criteria](#6)
7. [Owner/Manager Settings Matrix](#7)
8. [Open Questions/Pending Design](#8)
9. [V1 Roadmap, Post-V1 Roadmap & Addendums](#9)

---

<a name="1"></a>

## 1. Overview & Objectives

**Vision:**
DeelRx is a unified, multi-tenant platform providing regulated, inventory-driven retail with:

- Blazing-fast, accurate, privacy-first POS (Mobile + Web)
- Granular, owner-configurable privacy and security
- Full business control: inventory, credit, adjustments, audit, aliases, and compliance
- A spectrum from “open CRM” to “max secure alias-only” operation, with built-in failsafes

---

<a name="2"></a>

## 2. Target Users & Roles

| **User Level**     | **Devices**  | **Core Needs**                                     |
| ------------------ | ------------ | -------------------------------------------------- |
| Owner/Admin        | Web + Mobile | Config, compliance, risk, full control             |
| Manager/Supervisor | Web + Mobile | Inventory, reporting, advanced workflows           |
| Cashier/Employee   | Mobile       | Fast sales, minimal friction, compliance adherence |

---

<a name="3"></a>

## 3. Multi-Tenant Fundamentals

- **Tenant Isolation:** Each business is a silo; no cross-tenant access to data or presentation.
- **User Scoping:** Users may have accounts on multiple tenants/brands but never cross-pollination of team/content.
- **Tenant Onboarding:** All business-critical settings are captured & enforced at onboarding (see below).

---

## 4. Product Feature Domains

### 4.1 General Business Settings & Onboarding

#### **Feature Summary**

Capture all essential business data and owner preferences with a highly guided onboarding flow.
**All required fields must be unambiguous. Defaults shown at each step. All fields are always tenant-specific.**

#### **Detailed Requirements**

**Required on Onboarding:**

- Business Name (required)
- Shop Phone Number (required)
- Supported Units (select: grams, ounces, pounds, liters, milliliters—multiple can be enabled; default: all)
- Owner Contact (must provide secondary recovery email)
- Privacy Preset Selection (Open, Balanced, Private, Max Secure) | See [Privacy](#privacy) section
- Quickpick Product Quantities (edit: e.g., 1g, 3.5g, 7g, 1oz, 1L, etc.)
- Initial User Roles (Owner, Manager, Staff; can add custom roles)
- Product Alias Table (optional at onboarding, required before inventory import)
- [Optional] Store Address, Business Hours, Legal License/ID

**Editable at Any Time:**
All the above fields, plus:

- Intake/Adjustment Reasons (editable lists, required for audit log compliance)
- Credit Limit Policy (max per customer, required/optional manager overrides)
- Loyalty Program (enable/disable, tiers and percentages)
- POS Settings (enable/disable barcode, haptic feedback, offline mode)
- Compliance Retention Rules (GDPR mode, audit log retention)
- Allowed Export Types (limit data export by role/preset)
- Advanced triggers (see Privacy section)

**Onboarding Acceptance Criteria:**

- System will not allow transactional use until all required fields set.
- All onboarding settings are shown with “default values,” explanations and suggested best practice text.

---

### 4.2 Inventory Intake & Basic Adjustments

#### **Feature Summary**

All inventory actions are secure, auditable, and context-aware—supporting quick additions, adjustments, batch workflows, and full multi-unit conversion.
**Owner/manager configures which units are allowed, alias/nicknames, reasons for change, and staff permissions.**

#### **Detailed Requirements**

- **Supported Units:**
  - Business can enable any combination of: grams, ounces, pounds, liters, milliliters.
  - The system always handles conversion (e.g., 28g = 1oz, 1000ml = 1L), inventory can be entered in any enabled unit, displayed in canonical or business-preferred units.
  - All calculations are base-united and converted for consistency.
- **Intake (Mobile & Web):**
  - Product selection (by text search or barcode scan if enabled)
  - Quantity entry (auto-fills if standard alias is used)
  - Entry can be by mass or liquid volume depending on item
  - Reason selection (from owner-managed list, e.g.: “Restock”, “Sample Return”, “Correction”)
  - Optional: cost per unit (toggle enable/disable on mobile)
  - Confirmation summary shown before processing
- **Adjustments:**
  - Allow increments (e.g., +7g), decrements (-2oz), or absolute-set (“set to 100ml”)
  - All require reason (customizable list, e.g.: “Theft”, “Damage”, “Recount”)
  - Permission to adjust, and max allowed per staff/day, are owner-configurable
- **Batch Intake/Bulk (Web only):**
  - CSV import or multi-row entry (“Add 50 products at once”)
  - All required fields, no silent/skipped entries
  - Supplier/invoice, optional document/image upload (controlled by owner in settings)
  - Bulk-audit: all row changes are single transaction for audit, per-operator
- **Audit Logging:**
  - Every action stores: user, timestamp, previous qty, new qty, change delta, reason, device/app source
  - Logs are per tenant; cannot be exported or viewed except by authorized role per privacy preset
- **Performance:**
  - Mobile single intake <10s; bulk web <2s per 50 items
- **Error Handling:**
  - Staff see real-time feedback, haptic response
  - Block duplicate or conflicting entries; provide conflict messaging

#### **UI/Workflow Notes**

- “Add Inventory” easily accessible from POS/home
- Selectable quickpick for most-used units/aliases
- Recent changes/audit log view quick-access (last 5 events) for staff

#### **Non-Functional**

- Strict per-tenant separation, no cross-business inventory
- All forms auto-convert and display both input and canonical units before finalizing

#### **Acceptance Criteria**

- All changes reflect in audit logs within 30s
- Only users with correct permissions can intake/adjust; all attempts are logged

---

---

## 5. Non-Functional & Compliance Requirements

**a) Security**

- End-to-end encryption (data in transit and at rest, tenant scoped)
- Secure authentication (multi-factor for all owner/manager accounts)
- Permissions model per tenant, with “least privilege” defaults
- All actions (including settings changes, exports, privacy/self-destruct actions) are audit-logged and tamper-proof
- Privacy features and failsafe wipes are QA’d with both “safe” and “high-risk” data

**b) Performance**

- POS sales, intake, and lookup operations <1s per interaction (95th percentile on production hardware)
- Bulk ops (e.g., intake, CSV import) <2s per 50 items
- Self-destruct/failsafe lock actions <5s to full execution (and complete session lockout/expiry)

**c) Reliability**

- Offline-first: must sync up safely after mobile outage, deduplicate POS and inventory changes
- Historical logs kept per retention policy, never globally deleted

**d) Privacy/Compliance**

- GDPR “right to be forgotten” is supported when enabled (per preset); request leads to irreversible deletion of all applicable PII
- All audit logs, exports, and reporting honor privacy preset
- Strong documentation for compliance; legal-review opt-in if needed

---

## 6. Acceptance Criteria

- **Deployment:** All tenants/businesses are completely isolated; no data leaks or accidental “cross-talk” possible
- **Onboarding:** Businesses cannot launch without explicit completion of required onboarding fields and privacy preset choice
- **Usability:** All transactional flows tested for both high and ultra-private (alias-only) modes
- **Inventory/Alias:** QA passes for all alias auto-fill, conversion, and audit, including all edge-case input (slang, units, base measure, etc.)
- **Privacy/Failsafes:**
  - Audit logs always present for any data-at-rest or failsafe action
  - “Burn” actions are permanent, with out-of-band owner notification, and leave undecryptable traces only
  - “Test failsafe” option QA’d for safe simulation
- **Staff Roles/Permissions:** Staff scoped strictly to only the data, inventory, customers, and features their owner role permits

---

## 7. Owner/Manager Settings Matrix

| **Setting**                         | **Required Onboarding** | **Default**         | **Editable Post-Onboarding** | **Privacy Level/Controls** |
| ----------------------------------- | ----------------------- | ------------------- | ---------------------------- | -------------------------- |
| Business Name                       | Yes                     | —                   | Yes                          | All                        |
| Shop Phone Number                   | Yes                     | —                   | Yes                          | All                        |
| Store Address                       | No                      | Blank               | Yes                          | All                        |
| Supported Units                     | Yes                     | g, oz, lb, L, ml    | Yes                          | All                        |
| Unit Conversion/Equivalence         | Always                  | On (forced)         | No                           | All                        |
| Inventory Intake/Adjustment Reasons | Yes                     | Defaults (edit)     | Yes                          | All                        |
| Alias Table                         | Option                  | Pre-seeded          | Yes                          | All                        |
| Privacy Preset                      | Yes                     | Balanced            | Yes                          | All                        |
| Credit Limit/Policy                 | No                      | 0                   | Yes                          | All                        |
| Loyalty/Discount Tiers              | No                      | Bronze/Silver/Gold  | Yes                          | All                        |
| POS Workflow Settings               | Partial                 | Modern defaults     | Yes                          | All                        |
| Export Permissions                  | No                      | Balanced            | Yes                          | Privacy/Compliance         |
| Self-Destruct/Burn Setup            | Yes (code entry)        | Off (manual opt-in) | Yes                          | High/Max Secure            |
| Inactivity Deletion Timer           | No                      | 365d                | Yes                          | Private/Max Secure         |
| “Doomsday Mode”                     | No                      | Off                 | Yes                          | Max Secure only            |

---

## 8. Open Questions / Pending Design Review

- Business and compliance requirements for data destruction in highly regulated markets (owner’s lawyer sign-off may be required for destruct/“burn” mode)
- Cloud provider or OSS DB-specific constraints on PII irrecoverability (when using hosted DBaaS)
- Preferred “fallback” for unintended destruct: soft-lock or hard-delete?
- Workflow for owner to “test” failsafe with demo/placeholder data (QA policy)
- Usability testing for fully alias-only workflows (do cashiers ever get stuck/confused?)

---

## 9. V1 Roadmap & Beyond

### **V1 Roadmap**

| **Milestone**                 | **Target Date** | **Deliverable**                    |
| ----------------------------- | --------------- | ---------------------------------- |
| Multi-tenant Backend/API Core | Feb 2026        | Complete isolation, base DB        |
| Inventory & Alias MGMT MVP    | Feb 2026        | CRUD, unit/alias UI, audit logs    |
| POS/Transaction Core (Mobile) | Mar 2026        | <30s transaction, sync, alias/test |
| Privacy & Failsafe Layer      | Mar 2026        | Presets, field toggles, “burn”     |
| Web Admin for Advanced Config | Apr 2026        | Inventory, retention, permissions  |
| Reporting, Audit & Compliance | May 2026        | Owner dashboards, exports, logs    |
| Soft Launch, User/UAT         | May 2026        | End-to-end privacy/alias tests     |
| General Availability          | Jun 2026        | Final compliance sweep, QA         |

---

### **Post-V1 Features (Addendum/Roadmap)**

**1. Advanced Integrations:**

- Accounting/ERP export APIs, industry-specific compliance (Metrc, State, etc.)

**2. Automated AI Pricing:**

- AI/ML-driven margin suggestions, anomaly detection per product, privacy-permitted

**3. Inventory Forecasting:**

- Low inventory, heatmaps, “intelligent restock” automation

**4. Marketplace/Franchise Tools:**

- Multi-site business hierarchy, live inter-tenant inventory API, franchisee “tenant familes”

**5. Anonymous/Encrypted Messaging Module:**

- Owner-employee secured chat/audit, no external provider

**6. Programmatic Data Shredding/Audit Alerts:**

- Detect & auto-shred orphan/at-risk data, integration with legal “data destruction” request flow

---

#---

**END OF PRD V1**
(Reply to request any of the appendix/sample visual materials, onboarding guides, or further breakouts for feature-specific design sprints.)
