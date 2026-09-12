# Environment Variable Matrix

This document defines the authoritative environment variables across runtime environments for DRX (web, mobile, and backend functions).

## Core Application & Persistence (Convex Sole Ledger)

| Variable | Description | Required | Source / Scope |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex Cloud backend deployment URL | Yes | Convex (Public) |
| `CONVEX_DEPLOYMENT` | Target deployment identifier (e.g. `dev:...`, `prod:...`) | Build/Deploy | Convex |
| `CONVEX_DEPLOY_KEY` | Deployment credential for production function publishing | Production Deploy | GitHub Secret |
| `CONVEX_DEPLOY_KEY_STAGING` | Deployment credential for staging function publishing | Staging Deploy | GitHub Secret |
| `NEXT_PUBLIC_APP_URL` | Canonical Application URL (`https://deelrxcrm.app`) | Yes | Vercel / Runtime |
| `NEXT_PUBLIC_MARKETING_URL`| Canonical Marketing URL (`https://deelrxcrm.com`) | Yes | Vercel / Runtime |
| `DATABASE_URL` | Legacy Prisma/Neon connection string (build-time artifact) | Build | Neon / Secret Manager |

## Identity & Authentication (Clerk)

| Variable | Description | Required | Source / Scope |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key | Yes | Clerk (Public) |
| `CLERK_SECRET_KEY` | Clerk Server Secret Key | Yes | Clerk (Server / Convex) |
| `CLERK_FRONTEND_API_URL` | Clerk frontend API / issuer host | Recommended | Clerk |
| `CLERK_WEBHOOK_SECRET` | Signing secret for Clerk user lifecycle webhooks | Yes | Clerk (Convex action) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Canonical sign-in path (`/login` or `/sign-in`) | Yes | App Config |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Canonical sign-up path (`/register` or `/sign-up`) | Yes | App Config |
| `PLATFORM_CONSOLE_SLUG` | Private platform administrative entry (32-64 hex chars) | Server | Secret Manager |

## Privacy, Encryption & Compliance

| Variable | Description | Required | Source / Scope |
| :--- | :--- | :--- | :--- |
| `DRX_PII_KEY_CURRENT_B64` | Current AES-256 PII encryption key (32-byte base64) | Yes | Security / KMS |
| `DRX_PII_KEY_PREVIOUS_B64` | Previous PII encryption key for rotation fallback | Optional | Security / KMS |
| `DRX_PII_HASH_KEY_B64` | Keyed HMAC secret for deterministic PII lookup hashes | Yes | Security / KMS |
| `DRX_PRIVACY_CLEANUP_SECRET` | Bearer token for scheduled privacy cleanup endpoint | Yes | Security / Cron |

## Observability, Analytics & Error Tracking

| Variable | Description | Required | Source / Scope |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client DSN for frontend error capture | Yes | Sentry (Public) |
| `SENTRY_DSN` | Sentry server DSN (Edge / Node runtimes) | Yes | Sentry (Server) |
| `SENTRY_AUTH_TOKEN` | Build-time Sentry auth token for release source maps | CI / Build | GitHub Secret |
| `DEPLOYMENT_ENV` / `NEXT_PUBLIC_DEPLOYMENT_ENV` | Environment identifier (`production`, `staging`, `development`) | Yes | Runtime |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog Project API Key | Yes | PostHog (Public) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingestion host (`https://us.i.posthog.com`) | Yes | PostHog |
| `POSTHOG_PROJECT_ID` | PostHog project ID for telemetry and flags | Optional | PostHog |

## Storage & Background Services

| Variable | Description | Required | Source / Scope |
| :--- | :--- | :--- | :--- |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key | Yes | Cloudflare |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Key | Yes | Cloudflare |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | Yes | Cloudflare |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | Yes | Cloudflare |
| `RESEND_API_KEY` | Resend API Key for transactional emails | Yes | Resend |
| `INNGEST_EVENT_KEY` | Inngest event sending key | Yes | Inngest |
| `INNGEST_SIGNING_KEY` | Inngest endpoint webhook signature verification key | Yes | Inngest |
| `KV_REST_API_URL` | Upstash Redis REST API URL for distributed rate-limiting | Yes | Upstash |
| `KV_REST_API_TOKEN` | Upstash Redis REST API Token | Yes | Upstash |
| `HEALTHCHECK_SECRET` | Secret for deployment readiness and health check probe authorization | Optional | Operations |

## Prohibited in Production

The following variables must NEVER be set in Staging or Production environments:
- `BYPASS_AUTH_FOR_TESTING`
- `NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING`
- `BYPASS_AUTH_USER_ID`
- `BYPASS_AUTH_ORG_ID`
- `VISUAL_FIXTURES`
