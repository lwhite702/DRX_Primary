# Staging Preview Workflow (Vercel + Demo Data)

This document describes the fastest way to stand up a DRX preview (staging-style) build for client demos and seed demo data.

## What This Covers

- Deploy `apps/app` to a Vercel preview URL
- Enable auth bypass for testing (no Clerk login block)
- Seed a demo business, demo products, and demo customers
- Avoid accidental demo writes to the wrong database

## Current Reality (Important)

At the time this guide was added, the Vercel `preview` and `production` environments for `apps/app` are pointing to the same database as local.

That means **seeding demo data affects production data** unless preview/prod DBs are separated.

Use this flow only when you explicitly accept that risk.

## Commands

### 1) Pull Vercel Preview Environment (optional but recommended)

From repo root:

```bash
cd apps/app
vercel env pull .env.preview.local --environment=preview --yes
```

This creates `apps/app/.env.preview.local` for local preview-targeted scripts.

### 2) Deploy Preview (Staging) with Auth Bypass Enabled

From `apps/app`:

```bash
vercel deploy -y \
  -b NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING=true \
  -b BYPASS_AUTH_FOR_TESTING=true \
  -e NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING=true \
  -e BYPASS_AUTH_FOR_TESTING=true
```

Notes:

- `-e` sets runtime env vars for the deployment.
- `-b` sets build env vars so the build output is aligned with bypass mode.
- This creates a Vercel **preview** deployment (not production).

### 3) Seed Demo Data into the Target DB

The repo includes a repeatable demo seed script:

- `apps/app/scripts/seed-demo-business.mjs`

Run it against your chosen env file:

```bash
cd apps/app
DOTENV_CONFIG_PATH=.env.preview.local node -r dotenv/config scripts/seed-demo-business.mjs
```

Or, for local `.env.local`:

```bash
pnpm --filter deelrxcrm-app seed:demo
```

## What Gets Seeded

- Business: `DRX Demo Market`
- Business settings (including onboarding complete)
- Owner role for bypass auth user (`BYPASS_AUTH_USER_ID` or default local bypass UUID)
- 6 demo inventory products
- 4 demo customers
- Quick Sale exit PIN in business settings: `1234`

The script is **idempotent enough for demos**:

- Existing demo business is reused
- Existing products/customers (matched by SKU/email) are updated instead of duplicated

## Preview Test Checklist

After preview build completes:

1. Open the preview URL
2. Confirm bypass banner is visible
3. Confirm sidebar renders DRX logo and full navigation
4. Open `Quick Sale`
5. Verify products are listed/searchable
6. Open exit dialog and confirm Quick Sale exit behavior

## Recommended Next Step (Safer Staging)

Create a separate staging database and point Vercel `preview` env vars to it.

Once preview has its own DB:

- Keep this workflow
- Seed preview freely
- Avoid demo data leaking into production

