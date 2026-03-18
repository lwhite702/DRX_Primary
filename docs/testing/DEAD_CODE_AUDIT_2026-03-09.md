# Surgical Dead-Code Audit (2026-03-09)

Audit scope: whole repository (`apps/*`, `packages/*`, `scripts/*`, root manifests).
Method: `knip` static sweep + targeted symbol/reference verification via `rg`.

## 1. Findings Table

| # | File | Line(s) | Symbol | Category | Risk | Confidence | Action |
|---|------|---------|--------|----------|------|------------|--------|
| 1 | `apps/app/app/(app)/dashboard/_components/DashboardHeader.tsx` | 3 | `DashboardHeader` | UNREACHABLE_DECL | 🔴 HIGH | High (no inbound imports found; flagged unused file) | DELETE |
| 2 | `apps/app/app/(app)/dashboard/_components/SystemHealth.tsx` | 8 | `SystemHealth` | UNREACHABLE_DECL | 🔴 HIGH | High (no inbound imports found; flagged unused file) | DELETE |
| 3 | `apps/app/app/actions/beta.ts` | 16-36 | `joinWaitlist` | UNREACHABLE_DECL | 🔴 HIGH | High after verification (`submitSupportTicket` is live; `joinWaitlist` has no inbound references) | DELETE |
| 4 | `apps/app/components/feature-gate.tsx` | file | module exports | UNREACHABLE_DECL | 🔴 HIGH | High (flagged unused file; paired hook also unused) | DELETE |
| 5 | `apps/app/lib/hooks/use-feature-flag.ts` | file | `useFeatureFlag` | UNREACHABLE_DECL | 🔴 HIGH | High (only imported by unused `feature-gate.tsx`) | DELETE |
| 6 | `apps/app/app/api/featurebase/auth/route.ts` | 6 | `FEATUREBASE_API_KEY` (assigned, unread) | UNREACHABLE_DECL | 🔴 HIGH | High (in-file read count = 0) | RENAME_TO_UNDERSCORE |
| 7 | `apps/app/lib/quick-pos/selectors.ts` | 15 | `getCartCount` | UNREACHABLE_DECL | 🔴 HIGH | High after verification (no inbound references found in app/packages/scripts) | DELETE |
| 8 | `apps/app/lib/utils/offline-sync.ts` | 22 | `OfflineSyncManager` export | UNREACHABLE_DECL | 🔴 HIGH | High after verification (singleton is live, class export itself has no inbound references) | DELETE |
| 9 | `apps/app/lib/auth/server-guards.ts` | 30, 62, 69, 77 | `hasPermission`, `requirePermission`, `requireRole`, `protectRoute` | UNREACHABLE_DECL | 🟢 LOW | Low (security guard APIs may be consumed by config-driven routes or external callers) | SUPPRESS_WITH_COMMENT |
| 10 | `apps/app/lib/supabase/admin.ts` | 12 | `supabaseAdminClient` | UNREACHABLE_DECL | 🔴 HIGH | High after verification (`supabaseAdmin` is the only imported alias) | DELETE |
| 11 | `apps/app/components/ui/dialog.tsx` | 134, 139, 140 | `DialogClose`, `DialogOverlay`, `DialogPortal` | UNREACHABLE_DECL | 🟢 LOW | Low (public UI primitive surface; likely external package-level API) | SUPPRESS_WITH_COMMENT |
| 12 | `apps/app/components/ui/sheet.tsx` | 139-146 | `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetFooter`, `SheetDescription` | UNREACHABLE_DECL | 🟢 LOW | Low (public UI primitive surface) | SUPPRESS_WITH_COMMENT |
| 13 | `apps/app/package.json` | 45 | `@aws-sdk/client-s3` | PHANTOM_DEP | 🔴 HIGH | High after verification (direct app usage absent; provided transitively by `@wrelik/storage`) | DELETE |
| 14 | `apps/app/package.json` | 98 | `framer-motion` | PHANTOM_DEP | 🔴 HIGH | High after verification (no imports or config references found) | DELETE |
| 15 | `apps/app/package.json` | 104 | `next-themes` | PHANTOM_DEP | 🔴 HIGH | High after verification (`theme-provider.tsx` had no inbound imports) | DELETE |
| 16 | `apps/app/package.json` | 117 | `tailwindcss-animate` | PHANTOM_DEP | 🔴 HIGH | High after verification (app uses `tw-animate-css` instead; no plugin/config references found) | DELETE |
| 17 | `apps/mobile/package.json` | 24 | `@supabase/supabase-js` | PHANTOM_DEP | 🔴 HIGH | High after verification (no imports in mobile source; lint explicitly bans direct SDK usage) | DELETE |
| 18 | `apps/mobile/src/components/Button.tsx` | file | module exports | UNREACHABLE_DECL | 🔴 HIGH | High (unused file and no inbound imports detected) | DELETE |

### Dead-control-flow result
No **high-confidence** `DEAD_FLOW` branches were detected by this pass. A second pass with compiler-level unreachable-code checks (`allowUnreachableCode=false`) is recommended to catch subtle constant-condition paths.

## 2. Cleanup Roadmap

### Batch A — 🔴 HIGH (safe-first deletions)
- Candidate items: completed (#1, #2, #3, #4, #5, #6, #18).
- Observed impact: **~371 deletions / 26 additions** across the implemented cleanup pass.
- Potential impact: minor JS bundle and TS graph reduction (faster incremental type-checking, lower route cold-load noise).
- Refactoring order:
  1. Delete isolated unused components/files (`DashboardHeader`, `SystemHealth`, mobile `Button`).
  2. Remove `feature-gate` and then `use-feature-flag` together (avoid dangling import churn).
  3. Clean `FEATUREBASE_API_KEY` unread constant in API route.
  4. Delete the unused `joinWaitlist` export from `app/actions/beta.ts` while keeping `submitSupportTicket`.

### Batch B — 🟡 MEDIUM (likely dead, verify integration seams)
- Candidate items: none remaining after verification.
- Estimated LOC removed: **completed in code pass**.
- Potential impact: reduced install size and lockfile churn; slight CI/lint speed gains.
- Refactoring order:
  1. Keep re-running dependency verification after feature work that introduces new SDKs.

### Batch C — 🟢 LOW (public-surface or framework-magic risk)
- Candidate items: #9, #11, #12.
- Estimated LOC removed: **0–120 LOC** (if any).
- Potential impact: low; higher regression risk if these are public API contracts.
- Refactoring order:
  1. Confirm public-surface intent for dialog, sheet, and server guard helpers.
  2. Maintain the newly added inline intent comments and optionally back them with `knip` ignore patterns.
  3. If product requirements change, narrow exports in a major-version-safe way.

## 3. Executive Summary

| Metric | Count |
|--------|-------|
| Total findings | 18 |
| High-confidence deletes | 14 |
| Estimated LOC removed | ~345 net LOC (~371 removed / 26 added) |
| Estimated dead imports | 5 dependency entries |
| Files safe to delete entirely | 6 |
| Estimated build time improvement | ~2–6% incremental-check improvement (after file + dep cleanup) |

Overall health assessment: the codebase started this pass in **moderate debt** state with a healthy core but a noticeable tail of orphaned UI/components, dormant actions, and dependency bloat. That high-confidence tail has now been materially reduced; the remaining risk is mostly governance noise around intentional public exports plus unrelated typecheck instability outside this cleanup. The top-3 highest-impact actions now are: (1) codify intentional exports with `knip` ignores or equivalent config so future audits stay high-signal, (2) clear the pre-existing typecheck failures so dead-code scans can be validated in CI, and (3) review the lockfile strategy around floating specifiers like `latest` to avoid oversized dependency churn during small cleanup work.
