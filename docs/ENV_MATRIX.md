# Environment Variable Matrix

This document defines the required environment variables for the application to run.

| Variable                            | Description                       | Required | Source     |
| :---------------------------------- | :-------------------------------- | :------- | :--------- |
| `DATABASE_URL`                      | Neon PostgreSQL Connection String | Yes      | Neon       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Public Key                  | Yes      | Clerk      |
| `CLERK_SECRET_KEY`                  | Clerk Secret Key                  | Yes      | Clerk      |
| `R2_ACCESS_KEY_ID`                  | Cloudflare R2 Access Key          | Yes      | Cloudflare |
| `R2_SECRET_ACCESS_KEY`              | Cloudflare R2 Secret Key          | Yes      | Cloudflare |
| `R2_BUCKET_NAME`                    | Cloudflare R2 Bucket Name         | Yes      | Cloudflare |
| `NEXT_PUBLIC_POSTHOG_KEY`           | PostHog API Key                   | Yes      | PostHog    |
| `NEXT_PUBLIC_POSTHOG_HOST`          | PostHog Host URL                  | Yes      | PostHog    |
| `SENTRY_DSN`                        | Sentry Data Source Name           | Yes      | Sentry     |
| `RESEND_API_KEY`                    | Resend API Key for Emails         | Yes      | Resend     |
| `INNGEST_EVENT_KEY`                 | Inngest Event Key                 | Yes      | Inngest    |
| `INNGEST_SIGNING_KEY`               | Inngest Signing Key               | Yes      | Inngest    |
| `NEXT_PUBLIC_APP_URL`               | Canonical Application URL         | Yes      | App        |
