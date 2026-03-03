# Pre-commit checklist

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose
Ensure every commit meets baseline quality, policy, and safety checks before it is pushed.

## Scope
Use this checklist before committing code, configuration, or docs that affect behavior or release artifacts.

## Requirements
- All required local checks MUST pass.
- Secrets and environment hygiene MUST be validated.
- Repository policy violations MUST be resolved before commit.

## Checklist
- [ ] Linting passes with no blocking errors.
- [ ] Typecheck passes with no blocking errors.
- [ ] Relevant unit/integration tests pass.
- [ ] No direct banned vendor imports where adapters exist.
- [ ] No secrets or private keys are staged.
- [ ] No unintended environment files (for example `.env.local`) are staged.
- [ ] Lockfile policy is respected (pnpm lockfile only, if applicable).
- [ ] Versioning/release artifacts are updated for behavior changes.

Recommended command pattern:

```bash
pnpm lint && pnpm test && pnpm build
```

## Exceptions
For documentation-only commits, teams MAY skip build/test steps if repository policy allows it; lint and link integrity checks SHOULD still run.

## References
- `./CHECKLIST_PRERELEASE.md`
- `./AGENTS_POLICY.md`
