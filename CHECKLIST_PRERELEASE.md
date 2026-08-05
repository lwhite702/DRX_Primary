# Pre-release checklist

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03  
Applies To: Deelrx CRM

## Purpose

Provide a final release gate to reduce production regressions and policy drift.

## Scope

Use this checklist before promoting `staging` to `main`.

## Requirements

- Release metadata MUST be current.
- Critical user paths MUST be validated.
- Compliance and tenant isolation checks MUST pass.

## Checklist

- [ ] Version artifacts are complete (`CHANGELOG.md`, `VERSION`, root/app version consistency).
- [ ] `pnpm release:preflight` passes on Node `20.19.0`.
- [ ] `pnpm version:check` passes.
- [ ] Release notes reflect shipped behavior.
- [ ] Environment matrix documentation matches deployed config/secrets.
- [ ] Database migrations were tested in staging (if applicable).
- [ ] Tenant isolation and access boundaries were verified.
- [ ] Critical smoke paths were validated.
- [ ] Hybrid required gates are green (auth/data integrity + required UX suites).
- [ ] Feature freeze checks are green (`pnpm test:feature-freeze` and `pnpm test:feature-lock`) for v1.0 beta launch.
- [ ] Hardening contracts are green (`pnpm test:observability-contract`, `pnpm test:doppler-sync`, `pnpm test:feature-flags-contract`, `pnpm test:metadata-contract`, `pnpm test:login-surfaces`, `pnpm test:coverage:strict`).
- [ ] Advisory gate artifacts are attached (integration/full-e2e/security/perf/coverage).
- [ ] Compliance and policy checks passed.
- [ ] No policy exceptions remain undocumented.

## Exceptions

Emergency patches MAY ship with reduced scope checks only if incident notes and a full follow-up validation run are scheduled immediately.

## References

- `./RELEASE_POLICY.md`
- `./VERSIONING_POLICY.md`
