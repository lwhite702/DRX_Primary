# Versioning policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose
Standardize semantic versioning and release artifact expectations across Wrelik repositories.

## Scope
This policy applies to package versions, changelog entries, and release communication artifacts.

## Requirements
- Repositories MUST follow Semantic Versioning (`MAJOR.MINOR.PATCH`).
- Wrelik monorepos SHOULD use Changesets as the primary source for package version changes.
- Every shipped behavioral change MUST have a corresponding changelog/release note entry.
- Version bumps MUST match the impact level:
- `MAJOR`: breaking changes.
- `MINOR`: backward-compatible features.
- `PATCH`: backward-compatible fixes.

Changesets-first standard:
1. Add a changeset file for each publishable package change.
2. Select semantic bump type per package.
3. Include concise, factual summary.
4. Merge via PR; publish via repository release workflow.

Single-app adaptation (optional):
- If a repository is not package-based, teams MAY maintain a root `CHANGELOG.md` and optional `VERSION` file.
- This adaptation MUST still preserve SemVer rules and release-note discipline.

## Wrelik package SemVer rubric (`@wrelik/*`)

Apply this rubric to publishable packages in `wrelik-kit`:

- `MAJOR`
- Breaking export map/runtime subpath changes
- Behavior changes that require app code updates
- Error contract changes (shape, thrown error type, capture behavior)
- `MINOR`
- Backward-compatible new adapter helpers or options
- New exports that do not alter existing behavior
- `PATCH`
- Backward-compatible fixes/refactors
- Internal implementation changes with unchanged public contract
- Docs-only changes (no package publish needed unless bundled with code)

Changesets is the source of truth for package version bumps and changelog generation in this repository.

## Procedure
1. Classify change impact.
2. Create versioning artifact:
- Changeset (preferred).
- Root changelog entry (single-app adaptation).
3. Validate consistency between code changes and release notes.
4. Include versioning artifacts in the same pull request.

## Exceptions
Security hotfixes MAY be expedited, but MUST still receive retroactive release note updates within one business day.

## References
- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
