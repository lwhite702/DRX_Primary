# Policy Upstream Baseline

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03

## Upstream Source

- Source repository: `https://github.com/user/wrelik-kit`
- Source folder: `/docs/policies`
- Upstream commit: `4677f33fc4674f3d8f39e3e756354b2010b1e3af`

## Imported Files

- `WRELIK_AGENTS.md`
- `DEVELOPMENT_PROCESS.md`
- `VERSIONING_POLICY.md`
- `VERSION_MANAGEMENT_POLICY.md`
- `RELEASE_POLICY.md`
- `STACK_POLICY.md`
- `CHECKLIST_PRECOMMIT.md`
- `CHECKLIST_PRERELEASE.md`

## DRX Adaptations

- Added root `AGENTS.md` as the discoverable agent entrypoint while preserving `WRELIK_AGENTS.md` as canonical governance.
- Added a DRX-specific Linear-first change-control requirement: every repository edit must map to a synchronized issue in the Wrelik team's **Deelrx CRM** project.
- Branch governance adapted to DRX promotion path:
- `feature/*` -> `development` -> `staging` -> `main`
- Direct pushes disallowed for `main` and `staging`.
- `development` direct push allowed only for designated maintainers in emergency mitigation or docs/policy housekeeping with mandatory follow-up PR note.
- Versioning policy adapted to DRX tooling:
- `pnpm release:integrity`
- `pnpm release:prepare X.Y.Z`
- root/app `package.json` + `VERSION` + `CHANGELOG.md` consistency
- Stack policy retains adapter-first requirements and allows only documented time-bound compatibility exceptions.

## Governance

- This file is the source record for policy imports and deviations.
- Any future template refresh from `wrelik-kit` MUST update this file in the same PR.
