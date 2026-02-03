# Pre-Release Checklist

Before merging to `main` or deploying:

- [ ] **Versioning**: bumped `package.json` and updated `VERSION` file.
- [ ] **Changelog**: `CHANGELOG.md` updated with complying entry (Keep A Changelog format).
- [ ] **Env Matrix**: `docs/ENV_MATRIX.md` matches `.env.example` and production secrets.
- [ ] **Migrations**: DB migrations applied successfully to staging/prod.
- [ ] **Tenant Isolation**: Verified that user A cannot access user B's data.
- [ ] **Smoke Test**: Critical paths (Login, Checkout, Inventory) verify working.
- [ ] **Compliance**: `docs/COMPLIANCE_AUDIT.md` review shows no regressions.
- [ ] **Vendor Policy**: All imports use `@wrelik/*` packages (run `npm run compliance:imports`)
- [ ] **Secrets**: No environment files tracked in git (run `npm run compliance:secrets`)
- [ ] **Package Manager**: Only pnpm lockfile present (run `npm run compliance:lockfiles`)
