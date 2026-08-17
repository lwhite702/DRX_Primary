# Versioning policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-08-17
Applies To: Deelrx CRM

## Purpose

Standardize semantic versioning and release artifact expectations for this repository.

## Scope

Applies to version numbers, changelog entries, and release communication artifacts in DRX.

## Requirements

- Semantic Versioning (`MAJOR.MINOR.PATCH`) MUST be used. Prereleases MAY use
  a SemVer suffix such as `-rc.1`.
- Every shipped behavioral change MUST have a corresponding changelog entry.
- Root `package.json`, `apps/app/package.json`,
  `apps/mobile/package.json`, and `VERSION` MUST stay consistent.
- Expo and iOS marketing versions MUST match the numeric core of the release
  version. Native build numbers MUST remain synchronized between XcodeGen and
  the committed Xcode project.
- Version bumps MUST match impact:
- `MAJOR`: breaking changes.
- `MINOR`: backward-compatible features.
- `PATCH`: backward-compatible fixes.

## DRX Standard

DRX uses repository-native version tooling:

1. `pnpm version:check` for consistency verification.
2. `pnpm version:bump [major|minor|patch]` for coordinated stable bumps.
3. `node scripts/version.js set <semver>` for exact versions and prereleases.
4. `CHANGELOG.md` for release-note history.

## Procedure

1. Classify change impact.
2. Update `[Unreleased]` in `CHANGELOG.md` with factual entries.
3. Run `pnpm version:check`.
4. When cutting a release, run `pnpm version:bump <major|minor|patch>`.
5. Include version artifacts in the same PR as the release changes.

## Exceptions

Security hotfixes MAY be expedited, but release-note updates MUST be completed within one business day.

## References

- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
