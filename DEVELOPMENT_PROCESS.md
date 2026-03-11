# Development process

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03  
Applies To: Deelrx CRM

## Purpose

Define the standard end-to-end lifecycle for features, fixes, and experiments.

## Scope

This process covers local setup through production promotion and complements `WRELIK_AGENTS.md` with operational steps.

## Requirements

- Day-to-day work MUST happen on feature branches from `development`.
- The promotion path MUST be `feature/*` -> `development` -> `staging` -> `main`.
- All required quality gates MUST pass before promotion.
- Release artifacts MUST be updated before release promotion.

## Procedure

### 1. Local setup and sync

- Ensure your environment matches repository requirements (`node@20.18.0`, `pnpm@9.15.9`).
- Sync with `development`:

  ```bash
  git checkout development
  git pull origin development
  pnpm install --frozen-lockfile
  ```

### 2. Feature branching

- Create a scoped branch from `development`:

  ```bash
  git checkout -b feature/<short-description>
  ```

### 3. Iterative implementation

- Implement changes following established patterns.
- Run local checks continuously:

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  ```

### 4. Validation gate before PR

- Run release-relevant quality gates:

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  pnpm test:policy
  ```

- Use `CHECKLIST_PRECOMMIT.md` before opening a PR.

### 5. Merge into development

- Open PR from feature branch to `development`.
- Include what changed, why, risks, and rollback notes.
- Merge only after required review and CI success.

### 6. Promote development to staging

- Open promotion PR from `development` to `staging`.
- Verify integration, readiness, and environment checks on `staging`.

### 7. Promote staging to main

- Open release PR from `staging` to `main`.
- Validate `CHECKLIST_PRERELEASE.md` and release policy requirements.
- Merge after required approval.

### 8. Direct push exception (development only)

- Only designated maintainers may push directly to `development`.
- Allowed only for emergency mitigation or docs/policy housekeeping.
- Must include rationale and follow-up PR note.

## Exceptions

- Production hotfixes MAY branch from `main` for active incidents.
- Hotfixes merged to `main` MUST be back-ported to `development` immediately.

## References

- `./WRELIK_AGENTS.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
