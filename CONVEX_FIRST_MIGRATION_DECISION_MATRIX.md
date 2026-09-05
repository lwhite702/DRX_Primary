# Convex-first migration decision matrix (DRX)

Status as of: 2026-08-11  
Repo: `lwhite702/DRX_Primary`

## Executive summary

The codebase is currently **Prisma-first with selective Supabase compatibility shims**, not fully Convex-native.

- `@/lib/db` is the primary persistence path across most routes.
- `@/lib/supabase/server` and `@/lib/supabase/admin` are currently typed compatibility shims over Prisma (`createClient()` returns `db as any`).
- Several business-critical flows still call Supabase-flavored SQL/RPC logic through shared utility classes and direct table/RPC access.

Recommendation: migrate by domain in stages, with a strict `DataStore` abstraction, and preserve audit/rollback/permission behavior before each domain cutover.

## Domain migration matrix

| Domain / Surface | Current persistence usage | Convex-first complexity | Migration verdict |
|---|---|---|---|
| Notifications (`apps/app/app/api/notifications/**`, `notifications-audit`) | `@/lib/db` + `error/successResponse` patterns | Low | **Phase 1 eligible** |
| Team / Security / Admin (`team/**`, `security/**`, `admin/**`) | Primarily `@/lib/db` + auth helpers | Low-Medium | **Phase 1 eligible** |
| Business / Customers / Sales | Primarily `@/lib/db` + route-level `resolveAuthContext` | Medium | **Phase 1 eligible** |
| POS APIs (`pos/bootstrap`, `pos/preflight`, `pos/validate-credit`, `pos/apply-pricing`, `pos/shrinkage`, `pos/validate-stock`, `pos/checkout*`) | Mixed: routes on `@/lib/db`, shared helpers in `pos-weight-engine` use RPC-style Supabase patterns | Medium-High | **Phase 2 after helper migration** |
| Inventory writes (`inventory/intake`, `inventory/adjust`, `inventory/intake/approve`) | Direct Supabase-style RPC/table flows + explicit compensation (`rollback`) | High | **Phase 3 (defer)** |
| Credit / AI / Offline engine libs (`credit*`, `offline-sync`, `ai*`) | Extensive Supabase table/RPC usage in shared libs and recommendations/limits paths | High | **Phase 3 (defer)** |
| Featurebase / Notification preference endpoints | Direct `supabase.auth.getUser()` session paths | Medium-High | **Phase 2 with auth refactor** |

## High-confidence blockers

1. **Auth/session contract is split**
   - `resolveAuthContext` + Clerk flows are used broadly, while selected routes still rely on `createClient().auth.getUser()` and Supabase auth shapes.
2. **Business-scoped invariants are mixed**
   - Multiple auth/session resolution paths are still live and need a single policy before storage migration.
3. **Inventory transactional behavior is non-trivial**
   - Existing invariants include non-negative checks and rollback-on-failure behavior in stock mutation routes.
4. **Supabase-RPC dependency surface**
   - POS and credit pricing/discount/loyalty paths heavily use SQL logic (`rpc`) currently concentrated in shared utilities.

## Suggested migration sequence

### Phase 1 — Backend stabilization (no behavior change)
- Freeze auth/business-context contract:
  - Standardize route preconditions across all API families.
  - Standardize error/response shape, request correlation, and tenant filters.
- Add explicit schema/docs obligations via existing Moxie updates.
- Add targeted tests for tenant scoping and permission edges on a couple of representative routes.

### Phase 2 — Migrate low-risk domains to Convex adapter
- Migrate Notifications, Team/Security/Admin, Business, Customers, Sales API families to Convex-facing data adapter.
- Keep Supabase compatibility for preference/featurebase/auth endpoints in this phase only if required for continuity.

### Phase 3 — Shared logic extraction and migration
- Refactor `pos-weight-engine`, `offline-sync`, credit/AI utility layers from RPC-dependent behavior to Convex-safe query/mutation contracts.
- Migrate inventory write-heavy flows only after end-to-end parity tests for rollback/audit/invariants.

### Phase 4 — Cutover + cleanup
- Flip adapter selection and remove remaining compatibility shims.
- Run full migration evidence pass:
  - tenant isolation checks
  - audit consistency
  - rollback/error path parity
  - regression checks for high-usage operator workflows

## Linear issue packet (ready-to-paste)

Use this as the seed issue and child decomposition.

- **Title:** DRX-xxx — Convex-first migration: phase-gated backend conversion plan
- **Outcome:** Define and execute a safe phased conversion from current Prisma/Supabase-hybrid persistence to Convex-first architecture with preserved behavior.
- **Scope:** API and service layer only in first three phases above; no UI API contract changes visible to operators.
- **Out of scope:** Full product feature redesign, data-model renames, mobile app rewrite.
- **Acceptance criteria:**
  - Route-level auth/business scoping remains equivalent for all migrated domains.
  - Inventory adjustment/intake flows retain invariant checks and rollback semantics.
  - POS pricing/validation/shrinkage behavior is behaviorally equivalent after each migrated slice.
  - Audit logs and failure semantics remain non-regressive.
  - Verified proof added to issue for each phase (tests + runtime checks + migration evidence).
- **Dependencies:** Convex schema/mutations planning, auth adapter contract decision, shared RPC-to-convex query mapping.
- **Primary risks:** Silent behavior drift in Supabase-RPC business logic, permission regression, ordering drift in stock mutation/audit writes.
- **Linear decomposition suggestion:** one issue per phase (`Convex Phase 1`, `Convex Phase 2`, etc.) plus one blocker issue for each shared utility bundle (`pos-weight-engine`, `inventory-intake`, `credit-ai/offline`).
- **Reference to current authority:** `https://linear.app/wrelik/project/drx-1de1875e63de`

## Evidence anchors to link in Linear description

- Moxie AI context snapshot: `moxie.get_ai_context` (id=4)
- Doc impact scan: `moxie.get_doc_impact` for route family surfaces (id=5)
- Gap/opportunity outputs:
  - `moxie.get_doc_gaps`
  - `moxie.get_documentation_opportunities`
- Current adapter scan summary from this run:
  - `@/lib/db` dominant on API routes (high-volume domains)
  - Direct Supabase-session/table flow still used in inventory mutation + preference/featurebase/auth routes
- Supabase compatibility shim files:
  - `apps/app/lib/supabase/server.ts`
  - `apps/app/lib/supabase/admin.ts`

## Next action

Create a Linear parent issue named above, then add child tickets aligned to Phase 1–4.  
Use the criteria above in each child and attach this matrix as the issue context.
