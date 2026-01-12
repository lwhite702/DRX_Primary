# Changelog

All notable changes to DRX CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-11

### Added

- Version number display in sidebar footer and mobile navigation
- Comprehensive README with setup instructions, tech stack, and deployment guide
- Sentry feedback integration for bug reporting
- **Database Security**: RPC function `get_user_permissions` restored (resolving 404s).
- **Performance**: Index on `notifications(business_id)` and optimized RLS policies.
- **Frontend**: Search functionality in Credit Management.
- **Frontend**: Fractional quantity support in POS.

### Changed

- Sales positioned in center of mobile navigation for prominence
- Logo updated to icon.svg with transparent background
- Mobile navigation auto-closes when links are clicked
- Bottom navigation hidden on desktop to prevent duplicate navigation
- **Security**: Strengthened `/admin` route protection.
- **Security**: Hardened RLS policies for system tables (AI/Audit/Notifications).
- **Security**: Secured function search paths to `public`.

### Fixed

- E2E test workflow with Supabase setup and migrations
- Sentry release workflow made conditional on auth token availability
- TypeScript errors reduced from 143 to 67
- ESLint warnings cleaned up
- PWA manifest icon configuration
- Mobile menu responsiveness
- **Testing**: Validated/fixed assertions in Login test suite (TC002).

## [0.1.0] - 2024-12-28

### Added

- Initial DRX CRM application with core features
- Role-Based Access Control (RBAC) system with granular permissions
- Inventory management with unit of measure support (grams/ounces)
- Inventory intake workflow with approval system
- Customer management with credit limit tracking
- Sales/POS functionality
- Credit management with AI-powered recommendations
- Business profile and multi-business support
- Admin console for user and business management
- Feature flags system
- Support ticket system
- PWA support with offline capabilities
- Comprehensive database schema with migrations
- CI/CD workflows (lint, test, E2E)

### Security

- Row Level Security (RLS) policies on all tables
- Secure authentication with Supabase
- Audit logging for compliance

---

## Version History

### v0.1.0 (2024-12-28)

Initial beta release with core CRM, inventory, and POS functionality.

---

## How to Update This Changelog

When making changes:

1. Add items under `[Unreleased]` in the appropriate category:

   - **Added** for new features
   - **Changed** for changes in existing functionality
   - **Deprecated** for soon-to-be removed features
   - **Removed** for now removed features
   - **Fixed** for any bug fixes
   - **Security** for vulnerability fixes

2. When releasing a new version:
   - Move `[Unreleased]` items to a new version section
   - Update version in `package.json`
   - Update version displays in UI components
   - Create a git tag: `git tag v0.x.x`
