# Pre-Commit Checklist

Running `pnpm run check` (or equivalent) should pass all these steps.

- [ ] **Linting**: No eslint errors or warnings.
- [ ] **Typecheck**: `tsc` passes with no errors.
- [ ] **Banned Imports**: No direct usages of `supabase`, `clerk` (direct), `sentry` (direct), etc.
- [ ] **Secrets**: No secrets committed to git.
- [ ] **Placeholders**: No `TODO`, `FIXME`, or stub data in critical paths.

- [ ] **Tests**: Unit tests pass.
- [ ] **Versioning**: If logic changed, `package.json` version bumped and `CHANGELOG.md` updated.
