# Versioning Standard

This project follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Incompatible API changes, breaking changes to key workflows, or removal of features.
- **MINOR**: Add functionality in a backward compatible manner, wiring up live data, or significant behavior changes that are not breaking.
- **PATCH**: Backward compatible bug fixes, internal refactors, or non-user-visible changes.

## Single Source of Truth

The authoritative version for this project is stored in the `package.json` file in the root directory:

```json
{
  "version": "X.Y.Z"
}
```

All other references to the version (e.g., in documentation, UI, or build artifacts) must assume this value is the correct one.
