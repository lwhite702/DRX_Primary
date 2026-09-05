# Versioning policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-08-21
Applies To: Deelrx CRM

## Purpose

Standardize semantic versioning and release artifact expectations for this repository.

## Scope

Applies to version numbers, changelog entries, and release communication artifacts in DRX.

## Requirements

- Semantic Versioning (`MAJOR.MINOR.PATCH`) MUST be used.
- Every shipped behavioral change MUST have a corresponding changelog entry.
- `VERSION`, root/web/mobile packages, Expo, and every iOS marketing-version configuration MUST stay consistent.
- Native iOS build numbers and EAS/Play Android version codes MUST remain independent monotonic platform counters.
- Runtime version labels MUST read package or native metadata rather than embed a SemVer literal.
- Version bumps MUST match impact:
- `MAJOR`: any backward-incompatible removal or change to a public API, export, persisted data, operator workflow, or supported integration, including before `1.0.0`.
- `MINOR`: backward-compatible features.
- `PATCH`: backward-compatible fixes.
- `NONE`: documentation, tests, or internal-only work with no runtime behavior or version-surface change; this is a PR classification, not a SemVer bump.
- The highest applicable impact wins. Version-surface edits cannot declare `NONE`.
- `PATCH`, `MINOR`, and `MAJOR` PRs MUST change the leading `[Unreleased]` section, not only another part of `CHANGELOG.md`.

## DRX Standard

DRX uses repository-native version tooling:

1. `pnpm release:integrity` for the mandatory repository gate.
2. `pnpm release:prepare X.Y.Z` for planned metadata synchronization without a release claim.
3. `pnpm release:cut X.Y.Z` for an approved local changelog cut and customer-note draft.
4. `pnpm release:verify X.Y.Z --evidence PATH` for tag, SHA, promotion, GitHub release, and sanitized distribution evidence.
5. `CHANGELOG.md` for canonical technical history.

## Procedure

1. Classify change impact.
2. Update `[Unreleased]` in `CHANGELOG.md` with factual entries.
3. Run `pnpm release:integrity`.
4. When the target version is approved, run `pnpm release:prepare X.Y.Z` and keep the work under `[Unreleased]`.
5. After implementation and release-preflight evidence, run the approval-bound release cut and verification steps.
6. Include version artifacts in the same PR as the release changes.

## Exceptions

Security hotfixes MAY be expedited, but release-note updates MUST be completed within one business day.

## References

- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
