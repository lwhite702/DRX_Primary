# DRX pre-RC UX improvement list

Date: 2026-08-20

Tracking issue: WRE-63

Scope: desktop operator experience; native iOS follow-up remains required for parity

Status: locally implemented and verified; changes are not merged or deployed

This list records the user-visible UX work required before the next release
candidate. It is intentionally separate from the production-readiness verdict in
`DRX_PRODUCTION_READINESS_AUDIT_2026-08-20.md`; completing these items does not
make the application production-ready while the P0/P1 workflow gates remain.

## Current RC slice

| Priority | Improvement | Source evidence | Current state |
| --- | --- | --- | --- |
| P1 | Simplify the dashboard to daily health, actionable exceptions, four common actions, and concise non-empty activity | The dashboard rendered three duplicated preset layouts plus shortcuts, pinned items, movers, alerts, activity, and setup content | Implemented and locally verified |
| P1 | Keep existing dashboard values visible during refresh | `useDashboardData` reset `loading=true` for every request, replacing useful data with a full skeleton | Implemented and locally verified |
| P1 | Terminate the Team loading state when no business resolves | Team only cleared `loading` after a request that never started without `business.id` | Implemented and locally verified |
| P1 | Distinguish business loading from a truly missing business | Inventory treated the initial `null` business value as completed setup failure | Implemented and locally verified |
| P1 | Provide stable-shell route loading and a restrained transition | Most protected routes had neither a route loading boundary nor a shared transition wrapper | Implemented and locally verified |
| P1 | Replace manual tour viewport math and overlapping fallbacks | Tour used `getBoundingClientRect`, fixed card math, and a centered fallback when the target was absent | Implemented with installed Radix Popover and locally verified |
| P2 | Replace high-traffic text-only loading screens with skeletons | Settings, Team, profile, AI, sale, inventory, customers, reports, and administration used generic or text-only loading states | Implemented and locally verified for those surfaces |
| P2 | Remove avoidable hard navigation to Reports | POS admin action assigned `window.location.href`, discarding the client shell | Implemented with Next navigation and locally verified |
| P2 | Remove redundant Settings refresh after save | Settings refreshed business state and then forced `router.refresh()` | Implemented and locally verified |

## Required before the next RC

- [x] Run component regression tests for dashboard refresh, dashboard action
  density, Team terminal states, and tour target sequencing.
- [x] Run exact-Node-22 type checking, targeted lint, the complete web unit and
  integration suites, and the app plus marketing production builds.
- [ ] Exercise dashboard, Inventory, Team, Settings, and the first-run tour in a
  production-equivalent local build at desktop and tablet breakpoints.
- [ ] Verify keyboard-only tour navigation, Escape dismissal, focus placement,
  target collision near all viewport edges, missing targets, and reduced motion.
- [ ] Measure route-change and data-ready timings before and after the change;
  establish an RC budget for shell preservation and time to useful content.
- [x] Add regression coverage showing that prior-business responses are ignored,
  background refresh keeps current data visible, and chunk recovery never
  reloads automatically.
- [x] Apply the same initial-load, background-refresh, reconnect, error, and
  skeleton language across customers, credit, inventory
  intake/adjust/audit/search, reports, settings, administration, and sale.
- [ ] Add iOS parity acceptance for loading, refresh, error, transition, and tour
  equivalents where the feature exists natively.
- [ ] Run accessibility checks at 200% zoom and with reduced motion enabled.
- [ ] Obtain explicit deployment approval, merge the issue-linked change, deploy,
  and repeat the authenticated production workflow before closing WRE-63.

## P1-P3 execution inventory

The implementation state below is branch-local. "Implemented" does not mean
merged, deployed, or credentialed-production verified.

| Priority | Improvement | Branch-local state | Remaining RC evidence |
| --- | --- | --- | --- |
| P1 | Share/cache the business profile across protected routes | Implemented with one provider-owned request, last-good data retention, retry/error state, and safe business switching | Credentialed multi-business browser verification |
| P1 | Separate initial load, background refresh, mutation, empty, and error states | Implemented in business, role, inventory, customer, onboarding, and dashboard preference/data paths | Production slow/error injection against the deployed API |
| P1 | Replace remaining administration full-page text loaders | Implemented with page- or list-shaped skeletons | Authenticated role-by-role production check |
| P1 | Remove avoidable credit/onboarding route refreshes | Implemented with local mutation results and explicit completion callbacks; the operator-login refresh remains intentionally at the auth boundary | Credentialed mutation and session-activation check |
| P1 | Protect tenant-scoped hooks from stale responses | Implemented with abort/version guards and last-good data scoped to the active business | Credentialed two-business switch and concurrency check |
| P2 | Add tailored route skeletons for POS, inventory, customers, reports, and settings | Implemented | Production performance timings and visual review |
| P2 | Show non-blocking realtime reconnect/snapshot status | Implemented for inventory and customers | Controlled deployed disconnect/reconnect check |
| P2 | Define one transition vocabulary | Implemented: route fade/translate, sheet slide, dialog scale/fade, no refresh animation, reduced-motion override | Production route timing budget and native parity |
| P2 | Remove dashboard preferences that no longer affect the simplified view | Unused pinned UI and setter removed; stored metadata retained for compatibility | Migration/removal decision for legacy persisted metadata |
| P2 | Make skeleton animation accessibility-safe | Implemented with `motion-safe` animation plus the global reduced-motion override | Manual 200% zoom and assistive-technology review |
| P2 | Standardize the runtime on Node 22 | Implemented at Node 22.23.1 across engines, CI, Docker, documentation, and release preflight | CI run on the draft PR and deployment runtime confirmation |
| P2 | Fail closed on incomplete Upstash configuration | Implemented; local use safely bypasses cache while Vercel preview/production require the URL/token pair | Preview and production variable names are present; deployed behavior still needs a controlled check |
| P2 | Pin and provision the Playwright browser | Implemented with repository scripts and exact Chromium provisioning in CI; the pinned browser also ran locally from a task-specific cache | Draft-PR CI run |
| P3 | Move Sentry client initialization to `instrumentation-client.ts` | Implemented with default PII and replay capture disabled; observability contract passes | Controlled preview error receipt in Sentry |
| P3 | Replace technical labels and section codes with task language | Implemented across dashboard, administration, customer, inventory, and login surfaces | Product copy review |

## Local verification evidence

- Node runtime: exact `22.23.1` verified; release preflight passed with the
  frozen pnpm 9.15.9 install and version consistency checks.
- `pnpm --filter deelrxcrm-app typecheck`: passed on Node 22.23.1.
- `pnpm --filter deelrxcrm-app test:run`: 81 files, 470 tests passed;
  no failures or skips.
- `pnpm --filter deelrxcrm-app test:integration`: 15 files, 77 tests
  passed; no failures or skips.
- Changed-file ESLint: zero errors; legacy warnings remain. Full-repository
  ESLint is still a failed gate with 3,724 errors and 509 warnings, primarily in
  pre-existing generated/vendor content and existing restricted imports; this
  must be baselined or repaired before a READY verdict.
- Production build: passed on the second run, generating 114 application routes
  and 31 marketing routes. The first run exposed `/inventory/search` outside the
  shared provider boundary; moving it under the protected route group repaired
  the Release-only failure. Remaining warnings are the Prisma driver-adapter
  preview deprecation and intentionally disabled PWA output.
- Required Playwright suites: 8 public/auth-routing checks and 20 desktop/mobile
  protected-route UX checks passed using pinned Chromium. Visual fixtures or the
  development-only auth bypass were used, Clerk test keys were absent, and the
  local database was unreachable; these are UI regression checks, not
  credentialed workflow evidence.
- Accessibility Playwright suites: 8 public and 6 protected desktop/mobile checks
  passed with no serious or critical Axe findings. Protected checks used the
  development-only auth bypass. Reduced-motion behavior is also covered by the
  tour regression; 200% manual zoom verification remains open.
- Observability, environment, policy, security, repository-hygiene, secret-file,
  version, and migration rollback-policy checks passed. The migration check
  reports 21 documented legacy migrations without rollback files and enforces
  rollback companions for later migrations.
- Upstash variable names were verified, without reading values, in both preview
  and production Vercel environments.
- Authenticated production verification is intentionally still pending because
  this branch has not been merged or deployed and deployment requires explicit
  approval.

## Open-source implementation decision

The implementation uses the already-installed Radix Popover primitive for tour
anchoring, collision avoidance, focus handling, portal rendering, and Escape
dismissal. Route motion uses CSS and the Next App Router template/loading
conventions. Playwright supplies the pinned cross-viewport checks, and Sentry
remains the error reporter with replay/PII capture disabled. No new analytics
capture or external data processor is introduced.
