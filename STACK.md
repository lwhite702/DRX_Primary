# Wrelik Modular Stack

This repository adheres to the Wrelik Modular Stack standard.
All vendor integrations must be consumed via `@wrelik/*` packages.

## Authoritative Stack

| Function      | Vendor            | Packet Adapter          |
| :------------ | :---------------- | :---------------------- |
| **Database**  | PostgreSQL (Neon) | `@wrelik/db` (Prisma)   |
| **Auth**      | Clerk             | `@wrelik/auth`          |
| **Storage**   | Cloudflare R2     | `@wrelik/storage`       |
| **Analytics** | PostHog           | `@wrelik/analytics`     |
| **Errors**    | Sentry            | `@wrelik/errors`        |
| **Email**     | Resend            | `@wrelik/email`         |
| **Jobs**      | Inngest           | `@wrelik/jobs`          |
| **Payments**  | Stripe            | N/A (Direct or Adapter) |

## Rules

1.  **No Direct Vendor SDKs**: Application code must not import `clerk`, `sentry`, `posthog`, etc., directly.
2.  **No New Vendors**: Adding a new vendor requires a written Decision Document.
3.  **Tenant Isolation**: All data access must strictly enforce tenant scoping.
