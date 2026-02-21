# PR41_FOLLOWUP_MIGRATION_PLAN

## Purpose
- Keep PR #41 focused on production-readiness recovery and CI green status.
- Defer high-churn migration work to a dedicated follow-up stream.

## Deferred Scope Inventory
- `@/lib/supabase/client` imports: **46** call sites in `apps/app` (current branch snapshot).
- `@/lib/utils/pos-engine` imports: **7** call sites in `apps/app`.

## Why Deferred
- Migrating all call sites in this PR would mix architecture migration with branch rescue.
- The rescue objective is to preserve POS hardening, restore compile integrity, and pass required gates.

## Follow-up Sequence
1. Replace Supabase client usage in server routes with Prisma/server actions first.
2. Replace UI-side Supabase access with typed app APIs or server actions.
3. Split legacy POS engine usage from sales UI into new domain POS primitives.
4. Remove `apps/app/lib/supabase/client.ts` only after import count reaches 0.
5. Remove `apps/app/lib/utils/pos-engine.ts` only after import count reaches 0.

## Tracking Commands
```bash
rg -n "@/lib/supabase/client" apps/app -g '!**/node_modules/**'
rg -n "@/lib/utils/pos-engine" apps/app -g '!**/node_modules/**'
```
