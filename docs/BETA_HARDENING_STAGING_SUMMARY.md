# Beta Hardening + Staging Summary (Current State)

This summary captures the beta-launch hardening work completed in the DRX monorepo and the current staging/demo setup status.

## What Was Completed

### Auth / Login / Local Testing Unblock

- Added an env-gated auth bypass mode for local and preview testing (`NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING=true`)
- Kept Clerk in production code paths (no permanent removal)
- Added visible bypass indicators:
  - app shell banner
  - browser title prefix (`[BYPASS]`)
- Fixed middleware local redirect behavior so `localhost` requests stay local (no production `.app` redirect leaks)
- Added/updated auth route regression coverage and Playwright auth routing tests

### Quick Sale (POS) UX + Operator Flow

- Renamed Quick POS terminology to **Quick Sale** across nav and key UI surfaces
- Replaced confusing “Event Desk Board” terminology with **Operations Insights**
- Added a prominent **Quick Sale** nav action in the top nav
- Improved Quick Sale visual styling to better align with DRX look and feel
- Improved Quick Sale exit UX:
  - bypass mode clearly states no PIN is required
  - non-bypass mode shows where PIN is managed
  - demo fallback PIN documented (`1234`)

### Layout / Branding

- Moved DRX logo + Beta badge into the sidebar header (top-left)
- Unified desktop shell framing so top row and sidebar feel like one layout unit
- Increased sidebar logo size and removed excess whitespace by using a tightly cropped DRX wordmark asset

### Build / Dev Footguns

- `pnpm dev:bypass` now runs with **Turbopack** for faster local iteration
- Added `pnpm dev:bypass:webpack` fallback script
- Fixed repeated local Prisma schema-drift crashes (`P2022`) in business profile lookup paths

### Staging / Preview + Demo Data

- Added staging preview workflow documentation (deploy + seed + safety notes)
- Added repeatable demo seed script:
  - creates/updates demo business
  - seeds demo inventory products
  - seeds demo customers
  - writes Quick Sale exit PIN setting (`1234`)
- Seeded demo data into the currently configured shared database (by explicit approval)

### Crash Fix (Legacy Supabase Realtime Block)

- Fixed app crash caused by legacy Supabase realtime channel usage (`.channel(...)`)
- Realtime hooks now fail open (no crash) and continue initial data loading without live subscriptions until migrated

## New / Updated Docs

- `docs/STAGING_PREVIEW_WORKFLOW.md` (preview deploy + demo seed runbook)
- `docs/WRELIK_KIT_INTEGRATION.md`
- `docs/db-overview.md`
- `README.md` updates for monorepo roles, node policy, and staging/preview references

## Preview Deployment (Latest)

- Preview URL: `https://drx-fik0uk3sj-wrelik.vercel.app`

Note: Preview deploys were created with auth bypass enabled for testing.

## Important Risk / Follow-Up

- `apps/app` local, Vercel preview, and Vercel production currently point to the same database.
- Demo seeds and preview testing data affect the same DB unless preview/prod DB separation is implemented.

Recommended next action:

1. Create a separate staging database
2. Point Vercel `preview` env vars to that DB
3. Keep production env vars isolated

