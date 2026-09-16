# BETA_LAUNCH_CHECKLIST

Generated: 2026-03-30T08:15:39.205Z
Updated: 2026-03-30T08:20:00.000Z

## Beta Launch Rule (Hybrid Gates)
- Beta may ship only if all required gates are at 100%.
- Any failure in required gates is an automatic **NO-GO**.
- Advisory gates must run and produce artifacts, but do not block beta ship.

## Gate Verification
- [ ] Gate 0 - Build Stability (Required): `pnpm release:preflight`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (FAIL: preflight Node mismatch)
- [x] Gate 1 - Auth Stability (Required): required auth/data suite
- [x] Gate 2 - Environment Discipline (Required): matrix + policy checks
- [x] Gate 3 - Data Integrity (Required): POS/quick-pos + middleware/auth deterministic suites
- [x] Gate 6 - UX Readiness (Required): required e2e flow + required visual regression + required a11y
- [x] Gate 4 - Permissions + Audit (Advisory): audit integration suite executed
- [x] Gate 5 - Observability (Advisory): security + perf jobs executed and artifacts generated

## Release Controls
- [x] Feature freeze confirmation
- [x] Environment parity validation (policy and workflow contracts updated)
- [x] Secrets validation (production & staging environment secrets audited in WRE-8)
- [x] Production env var audit (verified against contract in WRE-8)
- [ ] DNS validation
- [ ] SSL validation
- [ ] Payment live key validation
- [ ] Analytics live mode validation
- [x] Admin access validation (platform slug isolation verified in WRE-8 / WRE-87)
- [x] Rate limiting confirmation (policy check)
- [x] Monitoring alerts active (Sentry and PostHog verified in WRE-9)
- [x] Rollback plan documented
- [x] Hotfix procedure documented

## Required Evidence
- CI gate run URL: _Pending next CI run on this branch_
- docs/testing/PRODUCTION_READINESS_REPORT.md: updated 2026-03-30T08:15:39.203Z
- docs/testing/FULL_GATE_RESULTS.json: updated 2026-03-30T08:15:39.205Z
- Coverage report path: apps/app/coverage (unit job artifact)
- Security scan report path: docs/testing/SECURITY_SCAN.json
- Performance report path: docs/testing/PERF_SMOKE.json
- Observability validation run: Advisory gate executed; local command exits non-zero with artifacts retained

## Deferred Scope Tracking
- [x] Legacy Supabase call-site migration tracked separately (remaining non-launch-critical call sites deferred)
- [x] Legacy POS engine call-site migration tracked separately
- [x] Follow-up inventory document linked (see launch packet)

## Sign-off
- QA Architect: ____________________
- Release Engineering: ____________________
- Product Owner: ____________________
