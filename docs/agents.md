# DRX Agent Guidance Supplement

This file is supplemental guidance only.

## Canonical Governance

All governance, branching, release, and versioning policy is defined in root canonical files:

- `/Users/lee/Projects/DRX_Primary/WRELIK_AGENTS.md`
- `/Users/lee/Projects/DRX_Primary/DEVELOPMENT_PROCESS.md`
- `/Users/lee/Projects/DRX_Primary/RELEASE_POLICY.md`
- `/Users/lee/Projects/DRX_Primary/VERSIONING_POLICY.md`
- `/Users/lee/Projects/DRX_Primary/VERSION_MANAGEMENT_POLICY.md`
- `/Users/lee/Projects/DRX_Primary/STACK_POLICY.md`
- `/Users/lee/Projects/DRX_Primary/CHECKLIST_PRECOMMIT.md`
- `/Users/lee/Projects/DRX_Primary/CHECKLIST_PRERELEASE.md`

If this file conflicts with any root policy file, the root policy file wins.

## Repository-Specific Notes

- Prefer established OSS solutions over custom implementations for non-differentiating capabilities.
- Reuse existing patterns and utilities before creating new abstractions.
- Keep domain logic in stable, testable modules.
- Preserve tenant isolation and adapter boundaries in all application changes.

## Marketing Content Canon

- Canonical marketing feature source: `/Users/lee/Projects/DRX_Primary/docs/MARKETING_TRUE_FEATURE_LIST.md`
- Claim governance matrix: `/Users/lee/Projects/DRX_Primary/docs/MARKETING_FEATURE_CLAIM_MATRIX.md`
- Marketing copy changes must start from the canonical feature list and remain aligned with matrix status.
- No claim may be promoted from `Beta` or `Planned` to `Live` without updating the claim matrix and adding evidence paths in the same change.
