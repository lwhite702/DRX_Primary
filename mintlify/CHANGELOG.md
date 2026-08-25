---
title: "Documentation Changelog"
description: "History of updates to DRX customer-facing documentation, runbooks, and guides."
icon: "clock-rotate-left"
---

This changelog tracks customer-facing DRX documentation updates and ties each update to a product release.

## How to use this file

For every docs update, log:

- Date
- Product version
- Pages affected
- Summary of changes

Do not ship silent documentation updates.

## Current release notes

## [Product Version 0.6.9] - 2026-08-25

### Pages affected

- /index
- /native-mobile-apps
- /delivery-fulfillment
- /fractional-and-bulk-pricing
- /legal-disclaimer
- /CHANGELOG

### Summary

- Added native mobile application runbook covering iOS SwiftUI and Android handheld terminals, offline sync, biometric security, and background reminders.
- Added delivery fulfillment guide covering courier dispatch, Uber quote allocation, and lifecycle tracking.
- Added fractional selling and bulk pricing tier guide covering exact weight entry, reciprocal dollar entry presets, and loyalty rewards.
- Unified brand identity, logo assets, and Mintlify theme colors (`#CCFF00`).

## [Product Version 0.5.3] - 2026-03-04

### Pages affected

- /index
- /getting-started
- /store-setup
- /how-sales-work
- /quick-sale-runbook
- /your-products
- /your-customers
- /payments-and-plans
- /numbers-that-matter
- /staying-compliant
- /team-access
- /keeping-your-data-safe
- /drx-privacy-protexion-protocol
- /failsafe-and-self-destruct
- /fixing-issues
- /beta-access-and-use
- /legal-disclaimer
- /glossary
- /CHANGELOG

### Summary

- Completed parity rewrite of Mintlify docs against current app routes and labels.
- Corrected customer requirements to match live alias-first behavior.
- Added dedicated Quick Sale runbook for `/pos/sale` -> `/pos/payment` -> `/pos/complete`.
- Replaced outdated Event Desk naming with Operations Insights.
- Reworked audit-ready wording while preserving `/staying-compliant` slug for link stability.
- Expanded operator runbooks with prerequisites, fast paths, blocked-path handling, explicit beta notes, and route-accurate references.
- Updated navigation to include quick-sale-runbook in Daily Operations.
- Added governance artifacts:
  - `docs/audits/mintlify-parity-audit-2026-03-04.md`
  - `docs/audits/mintlify-parity-matrix.json`

### Notes

- Claim policy used for this rewrite: strict live-only claims by default; beta surfaces explicitly labeled.
- Source of truth reviewed: app routes in `apps/app/app`, feature claim matrix, and brand voice guide.

## [Product Version 0.4.12] - 2026-02-13

### Pages affected

- /getting-started
- /how-sales-work
- /your-products
- /staying-compliant
- /your-customers
- /numbers-that-matter
- /team-access
- /store-setup
- /payments-and-plans
- /keeping-your-data-safe
- /failsafe-and-self-destruct
- /fixing-issues
- /beta-access-and-use
- /legal-disclaimer
- /glossary

### Summary

- Established external customer-facing Mintlify structure with required operator-friendly sections.
- Aligned wording to then-current app labels including Sales, Inventory, Customers, Credit, metrics, Settings, and Help.
- Documented reports limitation: page present with "No reports yet".
- Added policy/reference pages for beta access, legal use boundaries, and glossary terms.
- Added dedicated failsafe/self-destruct page to distinguish live safeguards from non-existent one-click destruction features.

### Notes

- Baseline validation was performed against live route implementations under `apps/app/app/(app)`.
