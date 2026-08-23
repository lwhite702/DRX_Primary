# Versioning Standard

This project follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Incompatible API changes, breaking changes to key workflows, or removal of features.
- **MINOR**: Add functionality in a backward compatible manner, wiring up live data, or significant behavior changes that are not breaking.
- **PATCH**: Backward compatible bug fixes, internal refactors, or non-user-visible changes.

## Single Source of Truth

The authoritative version for this project is stored in the `VERSION` file in the root directory:

```
X.Y.Z
```

Root/web/mobile packages, Expo, iOS marketing versions, and runtime displays must derive from or be synchronized with this value. Run `pnpm release:integrity` to verify them.

## Version Display Requirements

Per Wrelik Brands Versioning Protocol, the version MUST be displayed in:

1. Web surfaces render the web package version.
2. Native surfaces render the installed application's native version.
3. Source metadata remains synchronized by `pnpm release:prepare X.Y.Z`.
4. iOS build number and Android remote version code are verified separately against their provider immediately before submission.

## Compliance Checklist

When making version changes, ensure:
- `pnpm release:integrity` passes.
- Customer-visible implementation is recorded under `[Unreleased]`.
- Planned work remains on the roadmap and is absent from the customer changelog.
- Store build identifiers are based on current provider evidence rather than inferred from SemVer.
- Tags, deployment, store submission, Featurebase publication, and customer notification retain separate approvals.
