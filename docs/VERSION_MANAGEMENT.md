# Version Management Guide

Canonical policy source:

- `/Users/lee/Projects/DRX_Primary/VERSIONING_POLICY.md`
- `/Users/lee/Projects/DRX_Primary/VERSION_MANAGEMENT_POLICY.md`

## DRX Workflow

1. Add changes under `[Unreleased]` in `CHANGELOG.md`.
2. Run:

```bash
pnpm version:check
```

3. For release, run:

```bash
pnpm version:bump <major|minor|patch>
```

4. Confirm `CHANGELOG.md`, `VERSION`, and root/app versions are aligned in the release PR.
