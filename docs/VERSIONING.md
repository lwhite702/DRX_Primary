# Versioning Standard

This project follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version Format

DRX uses Semantic Versioning in the form `MAJOR.MINOR.PATCH`. Release
candidates use a SemVer prerelease suffix such as `0.6.0-rc.1`.

- **MAJOR**: Incompatible API changes, breaking changes to key workflows, or removal of features.
- **MINOR**: Add functionality in a backward compatible manner, wiring up live data, or significant behavior changes that are not breaking.
- **PATCH**: Backward compatible bug fixes, internal refactors, or non-user-visible changes.

## Single Source of Truth

The authoritative version for this project is stored in the `VERSION` file in the root directory:

```
X.Y.Z
```

The root, web, and Expo package versions must match this value exactly.
Apple and Expo native marketing versions use the numeric SemVer core because
App Store version fields do not accept prerelease suffixes. For example:

```text
Package/release version: 0.6.0-rc.1
Native marketing version: 0.6.0
Native build number: 30
```

Build numbers are independent, monotonically increasing release identifiers.
Changing a package version must not silently change a native build number.

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
   - `package.json`
   - `apps/app/package.json`
   - `apps/mobile/package.json`
   - `apps/mobile/app.json`
   - `apps/ios/project.yml`
   - `apps/ios/DRXApp.xcodeproj/project.pbxproj`
   - Any version constants or configuration files

## Compliance Checklist

When making version changes, ensure:

- `VERSION` and all package versions are updated.
- Native marketing versions match the numeric SemVer core.
- XcodeGen and the committed Xcode project use the same marketing and build versions.
- `CHANGELOG.md` has a factual entry.
- UI version displays are updated where applicable.
- `pnpm version:check` passes.

Use `node scripts/version.js set <semver>` for an exact version, including a
release candidate. Use `pnpm version:bump [major|minor|patch]` for a stable
increment.
