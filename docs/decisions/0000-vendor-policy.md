# ADR 0000: Vendor Policy

**Date:** 2026-02-02
**Status:** ACCEPTED

## Context

To ensure long-term maintainability, security, and compliance, DRX must adhere to strict vendor integration guidelines. Direct dependencies on third-party SDKs create tight coupling, making it difficult to swap providers, enforce consistent configurations, or mock services for testing.

## Decision

1.  **Mandatory Adapter Usage**: All third-party services (Auth, DB, Storage, Analytics, Errors, Email) must be accessed exclusively through `@wrelik/*` packages.
2.  **Banned Imports**: Direct imports of vendor SDKs (e.g., `@clerk/*`, `@sentry/*`, `posthog-js`) are explicitly banned in application code (`app/`, `components/`, `lib/`).
3.  **Approved Vendors Only**: Only the vendors listed in `STACK.md` are authorized.
4.  **No Placeholders**: Code must be production-ready. No `TODO` stub implementations for core infrastructure.

## Consequences

- **Positive**:
  - Standardized governance and configuration.
  - Easier upgrades of underlying vendors (handled in `@wrelik/*`).
  - Unified interface for all services.
- **Negative**:
  - Slight friction when a vendor feature is not exposed by the adapter.
  - Refactoring effort required to remove existing direct integrations.
