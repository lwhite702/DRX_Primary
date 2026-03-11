# Release policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03  
Applies To: Deelrx CRM

## Purpose

Provide a repeatable release process that ensures quality gates, clear versioning, and auditability.

## Scope

Applies to production-bound merges and tagged releases.

## Requirements

- Release promotion path MUST be `development` -> `staging` -> `main`.
- Required checks (tests, lint, build, typecheck, policy checks) MUST pass.
- Versioning artifacts MUST be present before release merge.
- Release tags MUST match shipped version numbers.

## Procedure

1. Confirm `development` is release-eligible and up to date.
2. Open promotion PR from `development` to `staging`.
3. Validate staging using:
- `CHECKLIST_PRECOMMIT.md`
- `CHECKLIST_PRERELEASE.md`
- readiness artifacts in `docs/testing/*` (when applicable)
4. Finalize release artifacts (`CHANGELOG.md`, `VERSION`, version consistency via `pnpm version:check`).
5. Open release PR from `staging` to `main` after approvals.
6. Merge release PR and create/push tag (`vX.Y.Z`) when required.
7. Publish release notes through CI/repository workflow.

## Exceptions

If urgent rollback is required:

- Roll back first.
- Document failure cause.
- Open corrective follow-up PR with remediation steps.

## References

- `./VERSIONING_POLICY.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./CHECKLIST_PRERELEASE.md`
- `./DEVELOPMENT_PROCESS.md`
