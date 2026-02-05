# Version Management Guide

## How Version Numbers Work

Deelrx CRM follows **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

### When to Bump Each Number:

- **MAJOR (x.0.0)** - Breaking changes, incompatible API changes
- **MINOR (0.x.0)** - New features, backwards-compatible additions
- **PATCH (0.0.x)** - Bug fixes, small improvements

---

## Workflow

### 1. During Development

As you make changes, add them to `CHANGELOG.md` under `[Unreleased]`:

```markdown
## [Unreleased]

### Added

- New inventory forecasting feature
- Export reports to CSV

### Fixed

- Mobile navigation auto-close issue
- Credit calculation rounding error
```

### 2. Check Suggested Version

Run the version helper to see what version bump is recommended:

```bash
node scripts/version.js check
```

This will analyze your changelog and suggest:

- **MAJOR** if there are breaking changes
- **MINOR** if there are new features
- **PATCH** if only bug fixes

### 3. Bump Version

When ready to release:

```bash
# This will:
# - Update package.json
# - Update CHANGELOG.md
# - Update UI version displays
node scripts/version.js bump
```

### 4. Commit and Tag

```bash
git add .
git commit -m "chore: Release v0.2.0"
git tag v0.2.0
git push origin main --tags
```

---

## Changelog Categories

Use these categories in your `[Unreleased]` section:

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features (triggers MAJOR bump)
- **Fixed** - Bug fixes
- **Security** - Security fixes

---

## Examples

### Scenario 1: Bug Fixes Only

```markdown
## [Unreleased]

### Fixed

- Fixed mobile menu not closing
- Corrected credit calculation
```

**Suggested: PATCH (0.1.0 → 0.1.1)**

### Scenario 2: New Feature

```markdown
## [Unreleased]

### Added

- New inventory forecasting dashboard
- Export reports to PDF

### Fixed

- Minor UI improvements
```

**Suggested: MINOR (0.1.0 → 0.2.0)**

### Scenario 3: Breaking Change

```markdown
## [Unreleased]

### Removed

- Removed legacy API endpoints

### Changed

- Redesigned authentication flow (BREAKING)
```

**Suggested: MAJOR (0.9.0 → 1.0.0)**

---

## Quick Reference

| Change Type        | Version Impact | Example       |
| ------------------ | -------------- | ------------- |
| 🐛 Bug fix         | PATCH          | 0.1.0 → 0.1.1 |
| ✨ New feature     | MINOR          | 0.1.0 → 0.2.0 |
| 💥 Breaking change | MAJOR          | 0.9.0 → 1.0.0 |

---

## Pre-Release Versions

For testing before official release:

- `v1.0.0-beta.1` - Beta release
- `v1.0.0-rc.1` - Release candidate
- `v1.0.0-alpha.1` - Alpha release
