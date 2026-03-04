# Policy Import Workflow

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03

## Purpose

Define the manual process for syncing DRX root policy files from `wrelik-kit` templates.

## Source of Truth

- Upstream templates: `/Users/lee/Projects/wrelik-kit/docs/policies`
- DRX canonical policy files: repository root policy files (`*.md` listed in `POLICY_UPSTREAM.md`)

## Procedure

1. Pull latest upstream templates:

```bash
cd /Users/lee/Projects/wrelik-kit
git pull
```

2. Copy policy templates into DRX root canonical files.
3. Apply DRX adaptation patch set:
- Branch governance (`feature/*` -> `development` -> `staging` -> `main`)
- DRX version tooling (`pnpm version:check`, `pnpm version:bump`)
- DRX-approved compatibility exception language in stack policy
4. Update metadata headers:
- `Owner: DRX Engineering Team`
- `Applies To: Deelrx CRM`
- `Last Updated: <current date>`
5. Update `POLICY_UPSTREAM.md` with upstream commit hash and adaptation summary.
6. Run validations:

```bash
pnpm test:policy
pnpm version:check
```

7. Open PR with:
- upstream commit used
- DRX-specific deltas
- risk and rollback notes

## Constraints

- `docs/policies` is intentionally not used in DRX.
- Root policy files are the only canonical policy source in this repository.
