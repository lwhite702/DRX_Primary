# Pre-commit checklist

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-07-17
Applies To: Deelrx CRM

## Purpose

Ensure every commit meets baseline quality, policy, and safety checks before push.

## Scope

Use this checklist before committing code, configuration, or docs that affect behavior or release artifacts.

## Requirements

- Required local checks MUST pass.
- Secrets and environment hygiene MUST be validated.
- Repository policy violations MUST be resolved before commit.

## Checklist

- [ ] A non-duplicate Linear issue exists in the **Deelrx CRM** project for this change.
- [ ] The Linear issue has an owner, priority, current status, acceptance criteria, and applicable Area/milestone/release labels.
- [ ] The branch references the Linear identifier, and blockers, scope changes, and validation evidence are synchronized.
- [ ] Linting passes with no blocking errors.
- [ ] Typecheck passes with no blocking errors.
- [ ] Relevant tests pass.
- [ ] `pnpm test:policy` passes.
- [ ] No direct banned vendor imports where adapters exist.
- [ ] No secrets or private keys are staged.
- [ ] No unintended environment files (for example `.env.local`) are staged.
- [ ] Lockfile policy is respected (pnpm lockfile only).
- [ ] Behavior changes are reflected in `CHANGELOG.md`.

Recommended command pattern:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:policy
```

## Exceptions

For documentation-only commits, teams MAY skip heavy build/test steps if repository policy allows it; lint and link integrity checks SHOULD still run.

## References

- `./CHECKLIST_PRERELEASE.md`
- `./WRELIK_AGENTS.md`
