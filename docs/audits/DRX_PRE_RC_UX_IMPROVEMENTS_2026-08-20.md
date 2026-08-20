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
| P2 | Replace high-traffic text-only loading screens with skeletons | Settings, Team, profile, AI, and sale details used full-page `Loading...` text | Implemented and locally verified for those surfaces |
| P2 | Remove avoidable hard navigation to Reports | POS admin action assigned `window.location.href`, discarding the client shell | Implemented with Next navigation and locally verified |
| P2 | Remove redundant Settings refresh after save | Settings refreshed business state and then forced `router.refresh()` | Implemented and locally verified |

## Required before the next RC

- [x] Run component regression tests for dashboard refresh, dashboard action
  density, Team terminal states, and tour target sequencing.
- [x] Run type checking, targeted lint, the complete web unit suite, and a
  production web build.
- [ ] Exercise dashboard, Inventory, Team, Settings, and the first-run tour in a
  production-equivalent local build at desktop and tablet breakpoints.
- [ ] Verify keyboard-only tour navigation, Escape dismissal, focus placement,
  target collision near all viewport edges, missing targets, and reduced motion.
- [ ] Measure route-change and data-ready timings before and after the change;
  establish an RC budget for shell preservation and time to useful content.
- [ ] Verify slow, failed, aborted, and repeated dashboard/Team requests do not
  expose stale tenant data or leave a permanent loader.
- [ ] Verify the same navigation and loading language across customers, credit,
  inventory intake/adjust/audit, reports, and sale detail.
- [ ] Add iOS parity acceptance for loading, refresh, error, transition, and tour
  equivalents where the feature exists natively.
- [ ] Run accessibility checks at 200% zoom and with reduced motion enabled.
- [ ] Obtain explicit deployment approval, merge the issue-linked change, deploy,
  and repeat the authenticated production workflow before closing WRE-63.

## Follow-up inventory

These items remain outside the first coherent repair and must stay visible in the
RC backlog:

| Priority | Follow-up | Known location or reason |
| --- | --- | --- |
| P1 | Share/cache the business profile across protected routes | `useBusiness` owns local state per hook instance and calls the profile action repeatedly |
| P1 | Add explicit initial/loading, background-refresh, mutation, empty, and error states to all data hooks | Several hooks still expose a single overloaded `loading` boolean |
| P1 | Replace remaining full-page text loaders on admin surfaces | Admin client, AI admin, and businesses admin retain `Loading...` states |
| P1 | Audit `router.refresh()` after credit and onboarding mutations | Credit panels and onboarding still force route refreshes; confirm whether targeted state/cache updates can replace them |
| P1 | Add stale-response protection to every tenant-scoped hook | Business switches and concurrent requests must never render a prior tenant's data |
| P2 | Add route-level skeletons tailored to POS, inventory, customers, reports, and settings | The shared protected-route skeleton is a safe fallback, not the final page-specific design |
| P2 | Add a visible non-blocking reconnect state for realtime inventory/customer channels | Production evidence showed API snapshot fallback without a clear in-product status |
| P2 | Define a single transition vocabulary | Fade/translate for route content, slide for drawers, scale/fade for dialogs, and no decorative motion for data refresh |
| P2 | Remove repeated dashboard configuration that no longer affects the simplified home view | Pinned-dashboard preferences remain available but are not shown on the simplified dashboard |
| P2 | Add skeleton contrast and animation accessibility checks | Skeletons need readable contrast and must stop animation under reduced motion |
| P2 | Move the runtime to Node 22 and remove the Supabase Node 20 deprecation | The production build passes but emits the dependency's Node 20 end-of-support warning |
| P2 | Validate Upstash configuration in every deployed environment | The configuration-free local production build warns that Redis URL/token are absent; values must remain secret and environment-managed |
| P2 | Pin and provision the Playwright browser used by CI/local RC checks | The installed runner expected a Chromium headless-shell revision that was absent locally, so the formal five-route smoke suite could not open a page |
| P3 | Move Sentry client initialization to `instrumentation-client.ts` | The production build passes but Next/Sentry reports the legacy filename deprecation |
| P3 | Replace technical labels and section codes with task language throughout the app | The dashboard slice is corrected; other surfaces still expose implementation-oriented copy |

## Local verification evidence

- `pnpm --filter deelrxcrm-app typecheck`: passed.
- Targeted UX regressions: 4 files, 16 tests passed.
- `pnpm --filter deelrxcrm-app test:run`: 78 files, 455 tests passed;
  no failures or skips.
- `pnpm --filter deelrxcrm-app test:integration`: 15 files, 77 tests
  passed; no failures or skips.
- Targeted ESLint: zero errors and 17 warnings in legacy touched pages.
- `pnpm --filter deelrxcrm-app build`: passed; 114 routes generated.
- Build warnings retained as follow-ups: Node 20/Supabase support, missing
  configuration-free local Upstash values, disabled PWA output, Prisma preview
  deprecation, and the Sentry client-config filename deprecation.
- Formal Playwright UX smoke: not executed because the runner's pinned Chromium
  headless-shell revision was not installed. A read-only system-Chrome diagnostic
  reached dashboard, inventory, Team, and Settings with HTTP 200, terminal
  non-loading content, and the route-transition wrapper; it also confirmed that
  a configuration-free production runtime correctly rejects missing Clerk keys.
  This diagnostic is not credentialed production evidence and is not counted as
  a passing E2E suite.
- Authenticated production verification is intentionally still pending because
  this branch has not been merged or deployed and deployment requires explicit
  approval.

## Open-source implementation decision

The current slice uses the already-installed Radix Popover primitive for tour
anchoring, collision avoidance, focus handling, portal rendering, and Escape
dismissal. Route motion uses CSS and the Next App Router template/loading
conventions. No new runtime package, analytics capture, or external data
processor is introduced.
