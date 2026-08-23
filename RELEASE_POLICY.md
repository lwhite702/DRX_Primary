# Release policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-08-21
Applies To: Deelrx CRM

## Purpose

Provide a repeatable release process that ensures quality gates, clear versioning, and auditability.

## Scope

Applies to production-bound merges and tagged releases.

## Requirements

- Release promotion path MUST be `development` -> `staging` -> `main`.
- Required checks (tests, lint, build, typecheck, policy checks) MUST pass.
- Launch preflight MUST pass (`pnpm release:preflight`) before release promotion.
- Versioning artifacts MUST be present before release merge.
- Release tags MUST match shipped version numbers.
- The exact state `planned`, `implemented`, or `released` MUST match the evidence rules in `.agents/skills/release-integrity/SKILL.md`.
- Beta launch uses hybrid gates:
  - Blocking: preflight, lint, typecheck, build, auth/data integrity tests, required UX tests.
  - Advisory with artifacts: integration, full e2e, auth-secrets e2e, security, perf, coverage.

## Procedure

1. Confirm `development` is release-eligible and up to date.
2. Open promotion PR from `development` to `staging`.
3. Validate staging using:
- `CHECKLIST_PRECOMMIT.md`
- `CHECKLIST_PRERELEASE.md`
- readiness artifacts in `docs/testing/*` (when applicable)
4. Run launch baseline preflight:
 - `pnpm release:preflight`
5. Finalize release artifacts and pass `pnpm release:integrity` and `pnpm release:preflight`.
6. Open release PR from `staging` to `main` after approvals.
7. Merge release PR and create/push tag (`vX.Y.Z`) when required.
8. Run `pnpm release:verify X.Y.Z --evidence PATH`, then separately approve any external release-note publication.

GitHub branch protection is not presently confirmed as enforceable for this private repository on its current plan. CI and repository policy are mandatory, but they MUST NOT be described as non-bypassable until required-check protection is enabled and verified.

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
