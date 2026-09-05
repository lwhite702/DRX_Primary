# DRX Agent Guidance Supplement

This file is supplemental guidance only.

## Canonical Governance

All governance, branching, release, and versioning policy is defined in root canonical files:

- `../WRELIK_AGENTS.md`
- `../AGENTS.md`
- `../DEVELOPMENT_PROCESS.md`
- `../RELEASE_POLICY.md`
- `../VERSIONING_POLICY.md`
- `../VERSION_MANAGEMENT_POLICY.md`
- `../STACK_POLICY.md`
- `../CHECKLIST_PRECOMMIT.md`
- `../CHECKLIST_PRERELEASE.md`

If this file conflicts with any root policy file, the root policy file wins.

## Repository-Specific Notes

- Start every repository change from a Linear issue in the Wrelik team's **Deelrx CRM** project. Follow `../AGENTS.md` and `../WRELIK_AGENTS.md` for required fields and status transitions.
- Prefer established OSS solutions over custom implementations for non-differentiating capabilities.
- Reuse existing patterns and utilities before creating new abstractions.
- Keep domain logic in stable, testable modules.
- Preserve tenant isolation and adapter boundaries in all application changes.

## Marketing Content Canon

- `./MARKETING_TRUE_FEATURE_LIST.md`
- `./MARKETING_FEATURE_CLAIM_MATRIX.md`
- Marketing copy changes must start from the canonical feature list and remain aligned with matrix status.
- No claim may be promoted from `Beta` or `Planned` to `Live` without updating the claim matrix and adding evidence paths in the same change.
- DRX Privacy ProteXion claims must be sourced from the canonical list + matrix and kept non-jargon, operator-first, and plain-language.
