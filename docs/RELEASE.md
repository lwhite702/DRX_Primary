# Release Process

This document summarizes DRX release execution.

Canonical policy source:

- `/Users/lee/Projects/DRX_Primary/RELEASE_POLICY.md`
- `/Users/lee/Projects/DRX_Primary/CHECKLIST_PRERELEASE.md`
- `/Users/lee/Projects/DRX_Primary/VERSIONING_POLICY.md`

## Promotion Path

1. `feature/*` -> `development`
2. `development` -> `staging`
3. `staging` -> `main`

## Release Steps

1. Confirm staging is release-eligible and checks are green.
2. Verify release artifacts:
- `CHANGELOG.md`
- `VERSION`
- root/app `package.json` versions aligned (`pnpm version:check`)
3. Open and approve PR from `staging` to `main`.
4. Merge release PR and create tag `vX.Y.Z` when required.
