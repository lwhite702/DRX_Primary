# Mintlify Parity Audit (2026-03-04)

Scope: `/Users/lee/Projects/DRX_Primary/mintlify`

Source of truth:
- `/Users/lee/Projects/DRX_Primary/docs/MARKETING_TRUE_FEATURE_LIST.md`
- `/Users/lee/Projects/DRX_Primary/apps/app/app`
- `/Users/lee/Projects/DRX_Primary/docs/BRAND_VOICE.md`

## Must-Fix Before Publish

- `P0`: `/your-customers` has incorrect required-field guidance and overconstrains live behavior.
- `P1`: Naming drift from `Event Desk Board` to `Operations Insights` in docs and glossary.
- `P1`: Forbidden voice lexeme in `/staying-compliant` body.
- `P1`: Operational pages are too shallow for frontline use (missing prereqs, route forks, and blocked-path recovery).
- `P1`: Mintlify changelog not updated with latest parity remediation and claim-policy decisions.

If any `P0` or `P1` item remains open, publishing is blocked.

## Scoring Rubric

- `5`: Complete, accurate, and operator-ready
- `4`: Strong with minor gaps
- `3`: Usable but notable risk
- `2`: Significant risk
- `1`: Incorrect or unsafe to publish

Axes:
- `feature_parity`
- `brand_voice`
- `operator_usability`
- `claim_safety`

## Page Scores

| Page | feature_parity | brand_voice | operator_usability | claim_safety | Severity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/index` | 3 | 4 | 3 | 4 | P1 | Needed explicit Quick Sale and Operations Insights entry points. |
| `/getting-started` | 4 | 4 | 3 | 4 | P1 | Missing role/prereq gates and blocked-path branches. |
| `/store-setup` | 4 | 4 | 3 | 4 | P1 | Missing explicit settings subroutes and permissions caveats. |
| `/how-sales-work` | 4 | 4 | 3 | 4 | P2 | Needed split between standard Sales and Quick Sale surfaces. |
| `/quick-sale-runbook` | 1 | 4 | 1 | 4 | P1 | Page missing; needed dedicated `/pos/*` flow coverage. |
| `/your-products` | 4 | 4 | 3 | 4 | P1 | Needed intake approval branch + low-stock escalation detail. |
| `/your-customers` | 1 | 4 | 2 | 2 | P0 | Incorrectly required first name + phone/email; conflicts with alias-first model. |
| `/payments-and-plans` | 4 | 4 | 3 | 4 | P1 | Needed tender-specific edge handling and clearer credit workflow guidance. |
| `/numbers-that-matter` | 2 | 4 | 3 | 4 | P1 | Outdated Event Desk naming; needed metric interpretation safeguards. |
| `/staying-compliant` | 4 | 1 | 3 | 4 | P1 | Forbidden lexeme present; rewrite required while keeping slug. |
| `/team-access` | 4 | 4 | 3 | 4 | P1 | Needed explicit role-task matrix mapped to live permissions. |
| `/keeping-your-data-safe` | 4 | 4 | 3 | 4 | P1 | Needed practical session revoke/lockout/vault checks. |
| `/drx-privacy-protexion-protocol` | 4 | 4 | 2 | 4 | P2 | Accurate but too technical for first-read operators. |
| `/fixing-issues` | 4 | 4 | 3 | 4 | P1 | Needed route-specific triage playbooks and duplicate-sale checks. |
| `/failsafe-and-self-destruct` | 4 | 4 | 3 | 4 | P2 | Needed stronger guardrails against destructive misread. |
| `/beta-access-and-use` | 4 | 4 | 3 | 4 | P2 | Needed explicit operational behavior when beta surfaces are limited. |
| `/legal-disclaimer` | 4 | 4 | 3 | 5 | P3 | Legally clear; minor operator-context improvements needed. |
| `/glossary` | 3 | 4 | 3 | 4 | P1 | Needed current UI labels and terminology cleanup. |
| `/CHANGELOG` | 3 | 4 | 3 | 5 | P1 | Process present; latest parity rewrite missing from ledger. |

## Evidence Notes

Evidence for each claim is cataloged in:
- `/Users/lee/Projects/DRX_Primary/docs/audits/mintlify-parity-matrix.json`

## Acceptance Gate

A publish-ready state requires:
1. Zero `P0`/`P1` unresolved findings.
2. No forbidden brand lexemes in Mintlify page text.
3. Every non-live claim is explicitly labeled as beta.
4. Every operational page includes: page purpose, prerequisites, fast path, blocked-path handling, beta notes, related docs.
