# Surgical Dead-Code Audit (2026-03-09)

Audit scope: whole repository (`apps/*`, `packages/*`, `scripts/*`, root manifests).
Method: `knip` static sweep + targeted symbol/reference verification via `rg`.

## 1. Findings Table

| # | File | Line(s) | Symbol | Category | Risk | Confidence | Action |
|---|------|---------|--------|----------|------|------------|--------|
| 1 | `apps/app/app/(app)/dashboard/_components/DashboardHeader.tsx` | 3 | `DashboardHeader` | UNREACHABLE_DECL | 🔴 HIGH | High (no inbound imports found; flagged unused file) | DELETE |
| 2 | `apps/app/app/(app)/dashboard/_components/SystemHealth.tsx` | 8 | `SystemHealth` | UNREACHABLE_DECL | 🔴 HIGH | High (no inbound imports found; flagged unused file) | DELETE |
| 3 | `apps/app/app/actions/beta.ts` | file | module exports | UNREACHABLE_DECL | 🔴 HIGH | High (unused file + no script/import references) | MOVE_TO_ARCHIVE |
| 4 | `apps/app/components/feature-gate.tsx` | file | module exports | UNREACHABLE_DECL | 🔴 HIGH | High (flagged unused file; paired hook also unused) | DELETE |
| 5 | `apps/app/lib/hooks/use-feature-flag.ts` | file | `useFeatureFlag` | UNREACHABLE_DECL | 🔴 HIGH | High (only imported by unused `feature-gate.tsx`) | DELETE |
| 6 | `apps/app/app/api/featurebase/auth/route.ts` | 6 | `FEATUREBASE_API_KEY` (assigned, unread) | UNREACHABLE_DECL | 🔴 HIGH | High (in-file read count = 0) | RENAME_TO_UNDERSCORE |
| 7 | `apps/app/lib/quick-pos/selectors.ts` | 15 | `getCartCount` | UNREACHABLE_DECL | 🟡 MEDIUM | Medium (unused export, but selector modules are often imported dynamically) | MANUAL_VERIFY |
| 8 | `apps/app/lib/utils/offline-sync.ts` | 22 | `OfflineSyncManager` | UNREACHABLE_DECL | 🟡 MEDIUM | Medium (unused export; could be future mobile/offline entrypoint) | MANUAL_VERIFY |
| 9 | `apps/app/lib/auth/server-guards.ts` | 30, 62, 69, 77 | `hasPermission`, `requirePermission`, `requireRole`, `protectRoute` | UNREACHABLE_DECL | 🟢 LOW | Low (security guard APIs may be consumed by config-driven routes or external callers) | SUPPRESS_WITH_COMMENT |
| 10 | `apps/app/lib/supabase/admin.ts` | 12 | `supabaseAdminClient` | UNREACHABLE_DECL | 🟡 MEDIUM | Medium (unused export now, but common DI/provider seam) | MANUAL_VERIFY |
| 11 | `apps/app/components/ui/dialog.tsx` | 134, 139, 140 | `DialogClose`, `DialogOverlay`, `DialogPortal` | UNREACHABLE_DECL | 🟢 LOW | Low (public UI primitive surface; likely external package-level API) | SUPPRESS_WITH_COMMENT |
| 12 | `apps/app/components/ui/sheet.tsx` | 139-146 | `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetFooter`, `SheetDescription` | UNREACHABLE_DECL | 🟢 LOW | Low (public UI primitive surface) | SUPPRESS_WITH_COMMENT |
| 13 | `apps/app/package.json` | 45 | `@aws-sdk/client-s3` | PHANTOM_DEP | 🟡 MEDIUM | Medium (not statically imported; may be runtime-only or upcoming feature) | MANUAL_VERIFY |
| 14 | `apps/app/package.json` | 98 | `framer-motion` | PHANTOM_DEP | 🟡 MEDIUM | Medium (not statically imported; verify before delete) | MANUAL_VERIFY |
| 15 | `apps/app/package.json` | 104 | `next-themes` | PHANTOM_DEP | 🟡 MEDIUM | Medium (ties to currently-unused `theme-provider.tsx`) | MANUAL_VERIFY |
| 16 | `apps/app/package.json` | 117 | `tailwindcss-animate` | PHANTOM_DEP | 🟡 MEDIUM | Medium (typically referenced in config; not detected in source scan) | MANUAL_VERIFY |
| 17 | `apps/mobile/package.json` | 24 | `@supabase/supabase-js` | PHANTOM_DEP | 🟡 MEDIUM | Medium (mobile adapters may hide runtime wiring; no static import found) | MANUAL_VERIFY |
| 18 | `apps/mobile/src/components/Button.tsx` | file | module exports | UNREACHABLE_DECL | 🔴 HIGH | High (unused file and no inbound imports detected) | DELETE |

### Dead-control-flow result
No **high-confidence** `DEAD_FLOW` branches were detected by this pass. A second pass with compiler-level unreachable-code checks (`allowUnreachableCode=false`) is recommended to catch subtle constant-condition paths.

## 2. Cleanup Roadmap

### Batch A — 🔴 HIGH (safe-first deletions)
- Candidate items: #1, #2, #3, #4, #5, #6, #18.
- Estimated LOC removed: **~350–550 LOC**.
- Potential impact: minor JS bundle and TS graph reduction (faster incremental type-checking, lower route cold-load noise).
- Refactoring order:
  1. Delete isolated unused components/files (`DashboardHeader`, `SystemHealth`, mobile `Button`).
  2. Remove `feature-gate` and then `use-feature-flag` together (avoid dangling import churn).
  3. Clean `FEATUREBASE_API_KEY` unread constant in API route.
  4. Move `app/actions/beta.ts` to archive (or delete if confirmed obsolete).

### Batch B — 🟡 MEDIUM (likely dead, verify integration seams)
- Candidate items: #7, #8, #10, #13, #14, #15, #16, #17.
- Estimated LOC removed: **~120–260 LOC** + dependency manifest shrink.
- Potential impact: reduced install size and lockfile churn; slight CI/lint speed gains.
- Refactoring order:
  1. Verify runtime usage for selectors/supabase/offline classes.
  2. Remove deps only after `pnpm why <pkg>` and grep verification.
  3. Re-run typecheck/tests after each dependency deletion batch.

### Batch C — 🟢 LOW (public-surface or framework-magic risk)
- Candidate items: #9, #11, #12.
- Estimated LOC removed: **0–120 LOC** (if any).
- Potential impact: low; higher regression risk if these are public API contracts.
- Refactoring order:
  1. Decide whether symbols are intentionally exported as a component kit/public API.
  2. If intentional, suppress with explicit comments and configure `knip` ignore patterns.
  3. If not intentional, narrow exports in a major-version-safe way.

## 3. Executive Summary

| Metric | Count |
|--------|-------|
| Total findings | 18 |
| High-confidence deletes | 7 |
| Estimated LOC removed | ~470–930 LOC |
| Estimated dead imports | 5 dependency entries (sampled) |
| Files safe to delete entirely | 6 |
| Estimated build time improvement | ~2–6% incremental-check improvement (after file + dep cleanup) |

Overall health assessment: the codebase is in **moderate debt** state with a healthy core, but it carries a noticeable tail of orphaned UI/components, dormant scripts/actions, and dependency bloat likely accumulated during rapid feature iteration. The top-3 highest-impact actions are: (1) execute Batch A hard deletions immediately, (2) prune the medium-risk dependency set with `pnpm why` + typecheck gates, and (3) formalize dead-code governance via `knip.json` ignores for intentional public APIs to prevent recurrent false positives and keep future audits actionable.

