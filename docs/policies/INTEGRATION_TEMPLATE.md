# Integration template

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All new Wrelik app repositories

## Purpose

Standardize how new applications record their integration with the shared Wrelik platform stack. This document serves as the authoritative record for onboarding health.

## Metadata

- App name: `Deelrx CRM`
- Repository: `https://github.com/lwhite702/DRX_Primary`
- Owner team: `DRX Engineering Team`
- Environment matrix: `../ENV_MATRIX.md`

## Requirements

- The integration record MUST be app-specific and complete before production launch.
- Adapter initialization MUST be centralized.
- Direct vendor imports SHOULD be removed from application-layer code when adapter coverage exists.

## Procedure

1. Fill metadata:
   - App name: `Deelrx CRM`
   - Repository: `https://github.com/lwhite702/DRX_Primary`
   - Owner team: `DRX Engineering Team`
   - Environment matrix: `../ENV_MATRIX.md`
2. List required packages and pinned versions.
3. Describe bootstrap/initialization order.
4. Document legacy-to-adapter import replacements.
5. Run and record integration validation checks.

## Template fields

### Core adapters

| Category  | Adapter package     | Version | Notes                       |
| --------- | ------------------- | ------- | --------------------------- |
| Auth      | `@wrelik/auth`      |         | [e.g. Clerk implementation] |
| DB        | `@wrelik/db`        |         | [e.g. Neon/Prisma]          |
| Storage   | `@wrelik/storage`   |         | [e.g. S3/UploadThing]       |
| Analytics | `@wrelik/analytics` |         |                             |
| Email     | `@wrelik/email`     |         |                             |
| Jobs      | `@wrelik/jobs`      |         |                             |

### Initialization order

Describe the runtime bootstrap sequence (e.g. `Config` -> `Errors` -> `Auth` -> `DB`).

### Environment Matrix

Link to the project's environment variable documentation.

## Verification

### Automated checks

| Test suite             | Command        | Status |
| ---------------------- | -------------- | ------ |
| Workspace integrity    | `pnpm check:*` |        |
| Adapter contract tests | `pnpm check:*` |        |
| Typecheck              | `pnpm type:*`  |        |

### Manual audit

- [ ] All direct vendor imports reviewed.
- [ ] Initialization layer verified in `lib/`.

## References

- `./STACK_POLICY.md`
- `./WRELIK_AGENTS.md`
- `./CHECKLIST_PRERELEASE.md`
