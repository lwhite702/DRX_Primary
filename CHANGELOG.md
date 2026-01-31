# Changelog

All notable changes to DRX CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-01-31

### Added

- **Inventory**: Product Unit Aliases (nicknames) for custom weights and quantities.
- **Settings**: Management UI for adding, enabling, and resetting product aliases.
- **POS**: Dynamic alias support in weight entry modal for quick selection.
- **Architecture**: Separated Landing Page from App Shell using Next.js route groups.
- **Automation**: TestSprite integration for automated PRD and test plan generation.

### Changed

- Updated middleware to support custom domain routing for landing page vs app shell.

## [0.2.0] - 2026-01-30

### Added

- **Docs**: Versioning and Release Process documentation (`7b10364`)
- **Mobile**: Modern mobile bottom navigation with central FAB and bounce animation (`d3fd1dc`)
- **Pricing**: Advanced pricing features (Fixed price/gram, Product Intake, AI Mock) (`f7c6c57`)
- **Security**: Authentication & RBAC for Team/Notifications APIs (`8ac669c`)
- **API**: Comprehensive endpoints for inventory, credit, and admin management (`80d5aa4`)
- **Schema**: Aligned schema, brand, and UX with native app (`b2f0966`)

### Changed

- Reconstructed changelog to reflect true version history based on git commits.

## [0.1.1] - 2026-01-11

### Fixed

- **Remediation**: Fixes for invalid login tests, POS fractional quantities, and Credit search (`ab21d77`)
- **Security**: Hardened RLS policies, secured function search paths (`ab21d77`)
- **Performance**: Optimized RLS caching and added missing indexes (`ab21d77`)
- **Tests**: Remediation of testsprite findings (rpc, pos, credit, admin) (`57dfd73`)
- **RLS**: Consolidate RLS policies for `inventory_intakes` (`880ae39`)

### Changed

- Bumped version to 0.1.1 (`2bdbaeb`)
- Removed unused imports (`df5bf7a`)

## [0.1.0] - 2025-12-28

### Added

- **Core**: Initial DRX CRM application with core features
- **Admin**: Business creation API and refactored admin page (`24fd609`)
- **UI**: Modern mobile menu component (`d74a1c9`)
- **UI**: Version number display (`ad7d8f6`)
- **Workflow**: Inventory intake approvals system (`83c6175`)
- **Automation**: Version management system (`dc90faa`)

### Changed

- **Navigation**: Center Sales in mobile navigation (`5f5ce6c`)
- **Design**: Updated logos and branding (`e3ee4a8`, `212f76f`)
- **Performance**: Optimized RLS policies (`1288aee`)
- **CI/CD**: Improved Supabase startup reliability (`373f4a2`)

### Fixed

- **Lint**: Fixed various lint errors and warnings (`fc460e5`, `33816f2`)
- **Tests**: Fixed E2E test env vars (`a00b640`)
- **RLS**: Fixed policies for admin access (`0c19fb2`)
