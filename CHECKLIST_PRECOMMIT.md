# Pre-Commit Checklist

Running `pnpm run check` (or equivalent) should pass all these steps.

- [ ] **Linting**: No eslint errors or warnings.
- [ ] **Typecheck**: `tsc` passes with no errors.
- [ ] **Banned Imports**: No direct usages of `supabase`, `clerk` (direct), `sentry` (direct), etc.
- [ ] **Secrets**: No secrets committed to git.
- [ ] **Placeholders**: No `TODO`, `FIXME`, or stub data in critical paths.
- [ ] **Environment Files**: No `.env.*` files tracked in git (except `.env.example`)
- [ ] **Package Manager**: Only pnpm lockfile present (no `package-lock.json` or `yarn.lock`)
- [ ] **Vendor Compliance**: All imports use `@wrelik/*` packages

### Quick Commands

Run these commands to verify compliance:

```bash
# Full compliance check
npm run compliance:full

# Individual checks
npm run compliance:imports   # Check for banned imports
npm run compliance:secrets   # Check for tracked secrets
npm run compliance:lockfiles # Check package manager consistency
```

- [ ] **Tests**: Unit tests pass.
- [ ] **Versioning**: If logic changed, `package.json` version bumped and `CHANGELOG.md` updated.
