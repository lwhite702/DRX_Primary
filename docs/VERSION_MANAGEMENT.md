# Version Management Guide

Canonical policy source:

- `../VERSIONING_POLICY.md`
- `../VERSION_MANAGEMENT_POLICY.md`

## DRX Workflow

1. Add changes under `[Unreleased]` in `CHANGELOG.md`.
2. Validate:

```bash
pnpm release:integrity
```

3. Prepare approved planned metadata without claiming a release:

```bash
pnpm release:prepare X.Y.Z
```

4. After implementation, preflight, and explicit approval, cut and verify the release with `pnpm release:cut X.Y.Z` and `pnpm release:verify X.Y.Z --evidence PATH`.
