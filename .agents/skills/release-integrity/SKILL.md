---
name: release-integrity
description: Enforce DRX release truth when product behavior or plans change, or when work touches versions, changelogs, roadmap status, release notes, tags, deployments, or TestFlight publication.
---

# Release integrity

Keep implementation, version metadata, and release claims in the same evidence state.

## Evidence state

Classify the work before editing release records:

- **planned**: approved direction exists; implementation or verification is incomplete.
- **implemented**: matching source is verified in a branch/PR and required repository checks pass; pending merge/push to `main`.
- **released**: the commit is merged and published to `main` (which automatically deploys and releases to production), or has verified store distribution.

Use the lowest state supported by reproducible evidence. Pushing/publishing product-behavior changes to `main` automatically triggers production deployment and release. Every product push to `main` changes the version and release number automatically; no push can share the same version or release number as a previous push. Pure documentation, test, or policy changes do not require a version change.

## SemVer decision

Apply the highest matching impact; DRX's pre-1.0 versions do not weaken these rules:

- **major**: any backward-incompatible removal or change to a public API, export, persisted data, operator workflow, or supported integration.
- **minor**: a backward-compatible feature or user-visible behavior change.
- **patch**: a backward-compatible bug fix.
- **none**: documentation, tests, or internal-only work with no runtime behavior or version-surface change (does not require a version change).

The PR declaration must match this classification. Version-surface edits require `patch`, `minor`, or `major` and user-visible impacts require a substantive diff in the leading `[Unreleased]` section.

The repository gate deterministically flags high-risk structural diffs, including exported contract removals or signature/type changes, same-name exports moved out of their original module, and destructive persisted-schema edits. A non-`major` declaration for those signals requires a changed `scripts/release/breaking-change-review.json` whose base SHA and exact signal set match the PR, with a substantive compatibility rationale and pull-request review reference. This is a conservative review trigger, not full semantic compatibility analysis. The offline gate validates the manifest and review-reference shape; human review and repository controls remain responsible for reviewer authority and the truth of the compatibility conclusion.

## Workflow

1. Inspect `VERSION`, relevant source, `CHANGELOG.md`, the customer roadmap/changelog, git refs, and distribution evidence relevant to the claim.
2. Declare `Release impact: none|patch|minor|major` and `Roadmap impact: none|add|move|remove` in the pull request.
3. Update records by state:
   - Planned capabilities belong in the approved product record and customer roadmap, not the customer changelog.
   - Implemented user-visible behavior belongs under the technical changelog's `[Unreleased]` section.
   - A release cut moves verified entries to a dated stable version and creates customer release-note drafts. Publication remains approval-bound.
   - Documentation-only corrections change only the records they correct unless product behavior also changed.
4. Run `pnpm release:integrity`. For release preparation also run `pnpm release:preflight`; for a release claim run `pnpm release:verify`.
5. Report the evidence state, exact version/SHA, checks run, external evidence, and remaining gates. Keep the issue out of Done while required external evidence is missing.

Read [references/artifact-map.md](references/artifact-map.md) when selecting artifacts, preparing or verifying a release, or publishing documentation updates.

## Boundaries

- Treat native build identifiers as monotonic platform counters independent of SemVer. Resolve the next value from App Store Connect/TestFlight or EAS/Play immediately before submission.
- Keep credentials and customer data out of release artifacts. Use synthetic or redacted evidence.
- HAPI Registry is advisory discovery only. Release CI authority stays local; MCP dependencies must satisfy `scripts/release/ci-dependency-allowlist.json`, and opaque or ephemeral remote MCPs are rejected.
- Tagging, deployment, store submission, external publication, and customer notification each require their own approval.
