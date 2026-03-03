# Version management policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose

Define operational steps for planning, preparing, and validating version bumps during development.

## Scope

Covers pre-release version preparation for package-based and single-app repositories.

## Requirements

- Teams MUST maintain an "unreleased" history in repository-managed release artifacts.
- Teams MUST ensure version intent is visible before merge.
- Teams SHOULD automate version checks where available.

## Procedure

1. During development, document notable changes in release artifacts:

- Changesets for package repos.
- `[Unreleased]` changelog section for single-app repos.

2. Before release, determine bump level (`major`, `minor`, `patch`).
3. Execute repository release tooling.
4. Validate that release notes map to actual shipped changes.
5. Tag release versions if required by repository workflow.

Example categories for release entries:

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
