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

All other references to the version (package.json, UI components, documentation, etc.) must be synchronized with this value.

## Version Display Requirements

Per Wrelik Brands Versioning Protocol, the version MUST be displayed in:

1. **App UI Components**:
   - Sidebar navigation footer
   - Mobile bottom navigation (in "More" menu)
   - Application footer
   - Settings page header

2. **Admin Panel**:
   - Admin console header

3. **Code References**:
   - package.json (used by build tooling)
   - Any version constants or configuration files

## Compliance Checklist

When making version changes, ensure:
- ✅ VERSION file updated
- ✅ package.json version updated
- ✅ CHANGELOG.md entry added
- ✅ UI components updated (sidebar, bottom-nav, admin, footer, settings)
- ✅ Documentation updated if applicable
- ✅ No TODOs or commented-out code added
