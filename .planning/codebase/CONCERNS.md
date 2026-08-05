# Codebase Concerns

**Analysis Date:** 2026-03-05

## Tech Debt

**Parallel architecture tracks in marketing app:**
- Issue: Landing stack currently includes newer `Cyber*` components while legacy landing/feature components still exist.
- Why: Ongoing redesign work without full cleanup pass.
- Impact: Increases maintenance surface and claim-check assumptions can drift.
- Fix approach: Consolidate on one landing architecture and retire unused legacy sections/components.

**Data layer transition complexity in app:**
- Issue: Supabase and Prisma paths coexist with ongoing adapter hardening.
- Why: Incremental migration approach to avoid large risky cutovers.
- Impact: Higher chance of inconsistent data-access patterns and duplicate logic.
- Fix approach: finish phased consolidation with explicit migration inventory and enforcement checks.

## Known Bugs

**Potential environment mismatch in local tooling:**
- Symptoms: scripts warn on Node version mismatch (`20.19.0` required, different local runtime used).
- Trigger: Running commands under non-policy Node version.
- Workaround: switch runtime to `.nvmrc` target before gates.
- Root cause: local shell/runtime drift.

**Auth route shape regressions historically sensitive:**
- Symptoms: Clerk sign-in/up forms can disappear when catch-all routes are misconfigured.
- Trigger: moving auth pages away from `[[...rest]]` convention.
- Workaround: keep catch-all route pattern and middleware matcher parity.
- Root cause: provider route contract requirements.

## Security Considerations

**Sensitive env key handling:**
- Risk: app relies on multiple provider secrets (Clerk, Supabase service role, Sentry, etc.).
- Current mitigation: env files + CI secret stores + policy docs.
- Recommendations: continue automated secret scanning and avoid embedding keys in docs/artifacts.

**Role and tenant boundary risks:**
- Risk: direct data calls outside adapter boundaries can weaken tenant scoping.
- Current mitigation: policy docs + tests + middleware checks.
- Recommendations: enforce adapter-only imports where adapters exist and expand tenant-isolation regression tests.

## Performance Bottlenecks

**Gate 0 install/build heaviness in monorepo:**
- Problem: full root lint/typecheck/build is expensive and sensitive to lockfile drift.
- Measurement: operationally significant in readiness gate workflows.
- Cause: monorepo breadth + multiple app surfaces.
- Improvement path: preserve deterministic lockfile discipline and keep CI cache strategy optimized.

**Landing UI complexity growth:**
- Problem: high-detail marketing sections can increase render/paint overhead.
- Measurement: likely visible on low-power devices if animations increase.
- Cause: many styled cards and overlays.
- Improvement path: keep animations lightweight and audit CLS/LCP on preview deploys.

## Fragile Areas

**Readiness/report scripts coupling:**
- Why fragile: scripts depend on expected paths and command names across docs, workflows, and package scripts.
- Common failures: renamed scripts or moved files break gate/report generation.
- Safe modification: change scripts + docs + workflow references in one PR; rerun `pnpm test:readiness`.
- Test coverage: script-level checks exist but broad integration still requires full gate run.

**Marketing claim enforcement scope:**
- Why fragile: checks are string-based and can miss semantic drift if canon and rendering diverge.
- Common failures: page structure changes without checker updates.
- Safe modification: update canonical module, rendering components, and claim-check requirements together.
- Test coverage: `pnpm test:marketing-claims` provides guardrail but not visual semantic validation.

## Scaling Limits

**Operational scaling for multi-surface releases:**
- Current capacity: manageable with current app/marketing/mobile split.
- Limit: coordination overhead rises as policy/gate requirements expand.
- Symptoms at limit: slower release cycles, more gate-break incidents.
- Scaling path: stricter ownership boundaries and automated preflight validation earlier in CI.

## Dependencies at Risk

**Version skew between root and package deps:**
- Risk: mixed versions across root and app package manifests (e.g., Next versions) can create subtle behavior differences.
- Impact: inconsistent local vs CI results.
- Migration plan: periodically align versions and verify with lockfile refresh + gate run.

## Missing Critical Features

**Automated visual baseline for marketing redesigns:**
- Problem: no always-on visual diff gate for landing changes.
- Current workaround: manual visual QA and ad-hoc review.
- Blocks: rapid high-confidence refactors of design-heavy sections.
- Implementation complexity: medium (Playwright screenshots + threshold checks).

## Test Coverage Gaps

**Cross-app integration smoke between marketing and app auth domains:**
- What's not tested: end-to-end from marketing CTA to app auth flow under production-like routing.
- Risk: redirect/domain drift can break conversion path.
- Priority: High.
- Difficulty to test: Medium (requires stable env + auth test setup across domains).

---

*Concerns audit: 2026-03-05*
*Update as concerns are remediated or newly discovered*
