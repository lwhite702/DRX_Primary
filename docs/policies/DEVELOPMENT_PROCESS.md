# Development process

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose

Define the standard end-to-end development lifecycle for features, fixes, and experiments to ensure consistency, quality, and velocity.

## Scope

This process covers the journey from local environment setup to production merge. It complements the `AGENTS_POLICY.md` by providing the operational "how-to".

## Requirements

- All development MUST occur on non-protected branches.
- Local environments MUST be kept in sync with upstream.
- Changes MUST be validated against the repository's quality gates before PR submission.
- Contributors MUST follow the repository's versioning and changelog requirements.

## Procedure

### 1. Local Setup and Sync

- Ensure your local environment matches the project requirements (Node version, package manager).
- Sync with the main branch:

  ```bash
  git checkout main
  git pull origin main
  pnpm install
  ```

### 2. Feature Branching

- Create a descriptive branch name:

  ```bash
  git checkout -b <type>/<short-description>
  ```

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### 3. Iterative Development

- Implement changes following established patterns.
- Run local development servers or watchers:

  ```bash
  pnpm dev
  ```

- Commit early and often with clear, logical messages.

### 4. Validation Gate

- Before opening a PR, run the local quality suite:

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  ```

- Refer to `CHECKLIST_PRECOMMIT.md` for specific manual checks.

### 5. PR and Review

- Push your branch and open a Pull Request.
- Follow the PR template (if available) or provide clear context:
  - **What**: Summary of changes.
  - **Why**: Rationale or issue reference.
  - **How**: High-level implementation overview.
- Address review feedback promptly.

### 6. Versioning and Merging

- Add required versioning artifacts (e.g., changesets or changelog entries).
- Ensure CI checks pass.
- Merge using the repository's preferred strategy (usually squash and merge).

## Exceptions

- Hotfixes for production outages MAY bypass non-critical validation steps but MUST still be reviewed.
- Documentation-only changes MAY skip heavy build/test cycles if the environment allows.

## References

- `./WRELIK_AGENTS.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./VERSION_MANAGEMENT_POLICY.md`
