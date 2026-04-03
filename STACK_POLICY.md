# Stack policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03  
Applies To: Deelrx CRM

## Purpose

Define the authoritative Wrelik modular stack and adapter boundaries so application code stays vendor-agnostic.

## Scope

This policy governs backend/frontend runtime integrations, data access patterns, observability, and platform adapters.

## Requirements

- Application code MUST consume external capabilities through `@wrelik/*` adapters whenever an adapter exists.
- Application code MUST NOT directly import vendor SDKs already abstracted by Wrelik packages, except documented exceptions.
- New vendors MUST be approved with a written architecture decision.
- Multi-tenant data access MUST enforce tenant scoping in every request path.

Authoritative mapping:

| Function | Vendor | Adapter |
| --- | --- | --- |
| Database | PostgreSQL (Neon) | `@wrelik/db` |
| Auth | Clerk | `@wrelik/auth` |
| Storage | Cloudflare R2 | `@wrelik/storage` |
| Analytics | PostHog | `@wrelik/analytics` |
| Errors | Sentry | `@wrelik/errors` |
| Email | Resend | `@wrelik/email` |
| Jobs | Inngest | `@wrelik/jobs` |
| Config | Environment schemas | `@wrelik/config` |

## Procedure

1. Select required capability from the mapping table.
2. Integrate via the corresponding `@wrelik/*` package.
3. Initialize adapters centrally in app bootstrap code.
4. Add tests confirming tenant isolation and adapter behavior.

## Exceptions

If an adapter does not exist for a required capability:

- Teams MAY use a direct vendor SDK temporarily.
- A decision record and migration plan to a shared adapter MUST be created.
- The exception MUST be time-bound and tracked.

Temporary compatibility bridges already in DRX MAY remain only when explicitly documented with owner, rationale, and removal criteria.

## References

- `./WRELIK_AGENTS.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./docs/WRELIK_KIT_INTEGRATION.md`
