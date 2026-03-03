# Release policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose
Provide a repeatable release process that ensures quality gates, clear versioning, and auditability.

## Scope
Applies to production-bound merges and tagged releases.

## Requirements
- Releases MUST be cut from the repository's designated release branch.
- Required checks (tests, lint, build, typecheck where configured) MUST pass.
- Versioning artifacts MUST be present before merge.
- Release tags MUST match shipped version numbers.

## Procedure
1. Confirm branch is up to date and release-eligible.
2. Validate checklist compliance:
- `CHECKLIST_PRECOMMIT.md`
- `CHECKLIST_PRERELEASE.md`
3. Finalize versioning artifacts:
- Changesets for package repos.
- Root changelog/version entries for single-app repos.
4. Open and merge release PR after required approvals.
5. Create and push release tag (`vX.Y.Z`) when repository policy requires tags.
6. Publish release notes or package artifacts through CI.

## Exceptions
If urgent rollback is required:
- Roll back first.
- Document the release failure cause.
- Open corrective follow-up PR with clear remediation steps.

## References
- `./VERSIONING_POLICY.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./CHECKLIST_PRERELEASE.md`
