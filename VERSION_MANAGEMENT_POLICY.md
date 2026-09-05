# Version management policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-08-21
Applies To: Deelrx CRM

## Purpose

Define operational steps for planning, preparing, and validating version bumps during development.

## Scope

Covers pre-release version preparation for this repository.

## Requirements

- Teams MUST maintain an unreleased history in `CHANGELOG.md`.
- Teams MUST ensure version intent is visible before merge.
- Teams MUST pass `pnpm release:integrity` before release promotion.
- Planned, implemented, and released states MUST be described only at the evidence level defined by `.agents/skills/release-integrity/SKILL.md`.

## Procedure

1. During development, document notable changes in `CHANGELOG.md` under `[Unreleased]`.
2. Before release, determine bump level (`major`, `minor`, `patch`).
3. Run `pnpm release:integrity` and resolve mismatches.
4. Run `pnpm release:prepare X.Y.Z` when the planned release version is approved; keep entries under `[Unreleased]`.
5. Run `pnpm release:cut X.Y.Z` only after implementation and preflight evidence are complete.
6. Validate release notes map to shipped changes and run `pnpm release:verify X.Y.Z --evidence PATH` after the separately approved tag/release/distribution actions.

Release entry categories:

- Added
- Changed
- Fixed
- Security
- Deprecated
- Removed

## Exceptions

Minor wording-only documentation updates MAY be grouped into a later patch release if no runtime behavior changed.

## References

- `./VERSIONING_POLICY.md`
- `./RELEASE_POLICY.md`
