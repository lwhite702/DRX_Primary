# Changelog

This changelog tracks customer-facing Deelrx CRM documentation updates and ties each update to a product release.

## How to use this file

For every docs update, log:

- Date
- Product version
- Pages affected
- Summary of changes

Do not ship silent documentation updates.

## Template

## [Product Version X.Y.Z] - YYYY-MM-DD

### Pages affected

- /getting-started
- /how-sales-work

### Summary

- Updated setup flow to match current onboarding labels.
- Corrected payment method list in sales workflow.

### Notes

- Source of truth reviewed: live app UI labels and current production workflows.

## Current baseline

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
- Aligned wording to current app labels including **Sales**, **Inventory**, **Customers**, **Credit Management**, **Event Desk Board**, **Settings**, and **Help & Support**.
- Documented current **Reports** limitation: page is present with "No reports yet."
- Added policy/reference pages for beta access, legal use boundaries, and glossary terms.
- Added a dedicated failsafe/self-destruct page that distinguishes live safeguards from non-existent one-click destruction features.

### Notes

- UI copy source file `EXTRACTED_UI_COPY.md` was not present in this workspace at build time.
- Baseline was validated against live route/page implementations in `apps/app/app/(app)`.
