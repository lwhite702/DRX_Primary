# Development process

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-07-17
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
- Every repository change MUST have a Linear issue in the Wrelik team's **Deelrx CRM** project before editing begins.
- The Linear issue MUST remain synchronized with ownership, priority, Area, milestone, dependencies, status, and validation evidence.

## Procedure

### 1. Linear intake

- Search the Deelrx CRM project for an existing issue covering the requested work.
- Reuse the existing issue; create a new one only when no issue covers the scope.
- Before editing, confirm the issue includes:
  - user or operational outcome;
  - acceptance criteria;
  - assignee and priority;
  - one Area label when applicable;
  - milestone and `Release Gate` / `Live E2E` labels when applicable;
  - dependencies, blockers, and relevant repository context.
- Move accepted work from `Todo` to `In Progress` when implementation begins.

### 2. Local setup and sync

- Ensure your environment matches repository requirements (`node@22.23.1`, `pnpm@9.15.9`).
- Sync with `development`:

  ```bash
  git checkout development
  git pull origin development
  pnpm install --frozen-lockfile
  ```

### 3. Feature branching

- Create a scoped branch from `development`:

  ```bash
  git checkout -b feature/WRE-123-<short-description>
  ```

### 4. Iterative implementation

- Implement changes following established patterns.
- Record material scope changes, blockers, and dependency discoveries in Linear as they occur.
- Run local checks continuously:

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  ```

### 5. Validation gate before PR

- Run release-relevant quality gates:

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  pnpm test:policy
  ```

- Use `CHECKLIST_PRECOMMIT.md` before opening a PR.
- Attach reproducible validation evidence to the Linear issue.

### 6. Merge into development

- Open PR from feature branch to `development` and include the Linear identifier in the branch and PR.
- Include what changed, why, risks, and rollback notes.
- Move the Linear issue to `In Review` while the PR or required QA is under review.
- Merge only after required review and CI success.
- Move the Linear issue to `Done` only after acceptance criteria are met and evidence is linked. Create linked follow-up issues for deferred work.

### 7. Promote development to staging

- Open promotion PR from `development` to `staging`.
- Verify integration, readiness, and environment checks on `staging`.

### 8. Promote staging to main

- Open release PR from `staging` to `main`.
- Validate `CHECKLIST_PRERELEASE.md` and release policy requirements.
- Merge after required approval.

### 9. Direct push exception (development only)

- Only designated maintainers may push directly to `development`.
- Allowed only for emergency mitigation or docs/policy housekeeping.
- Must include rationale and follow-up PR note.
- Must reference a Linear issue. Active incident containment MAY create the issue immediately after stabilization, but not later.

## Exceptions

- Production hotfixes MAY branch from `main` for active incidents.
- Hotfixes merged to `main` MUST be back-ported to `development` immediately.

## References

- `./WRELIK_AGENTS.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
