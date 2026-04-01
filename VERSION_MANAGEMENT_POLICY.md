# Version management policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03  
Applies To: Deelrx CRM

## Purpose

Define operational steps for planning, preparing, and validating version bumps during development.

## Scope

Covers pre-release version preparation for this repository.

## Requirements

- Teams MUST maintain an unreleased history in `CHANGELOG.md`.
- Teams MUST ensure version intent is visible before merge.
- Teams SHOULD run automated version checks before release promotion.

## Procedure

1. During development, document notable changes in `CHANGELOG.md` under `[Unreleased]`.
2. Before release, determine bump level (`major`, `minor`, `patch`).
3. Run `pnpm version:check` and resolve mismatches.
4. Run `pnpm version:bump <major|minor|patch>` when release version is approved.
5. Validate release notes map to shipped changes.
6. Tag release versions per `RELEASE_POLICY.md`.

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
