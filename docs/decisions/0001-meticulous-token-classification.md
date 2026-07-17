# ADR 0001: NEXT_PUBLIC_METICULOUS_TOKEN Classification

**Date:** 2026-07-17
**Status:** ACCEPTED

## Context

Meticulous is a UI testing tool used to capture sessions for automated replay/regression tests in development and preview environments. The `NEXT_PUBLIC_METICULOUS_TOKEN` variable holds the recording token for the project. Concerns were raised regarding whether this token should be kept secret or exposed to the client.

## Decision

1. **Classification as Public Token**: The `NEXT_PUBLIC_METICULOUS_TOKEN` is classified as a **public recording token**, not a secret. This token is designed to identify the project on the client side so that the Meticulous recorder script running in the user's browser can upload event logs/sessions.
2. **Equivalent to Analytics Identifiers**: It is functionally equivalent to a Sentry DSN, PostHog public API key, or Google Analytics tracking ID. It does not authorize any API read access or configurations.
3. **Restricted Usage**: The script loading logic in `layout.tsx` gates recording to non-production environments (`NODE_ENV === "development"` or `VERCEL_ENV === "preview"`), ensuring it is never active on production builds.

## Consequences

- **Positive**:
  - The recording agent can function correctly in the browser for local testing and Vercel previews.
  - The token is safely documented as non-secret, preventing future false-positive flags.
- **Negative**:
  - The token remains visible in client bundles in preview environments, which is acceptable since it cannot be used for any malicious action.
