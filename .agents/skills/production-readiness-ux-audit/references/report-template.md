# Production Readiness UX Audit Report

Use this structure when the user asks for a formal audit, reproducible checklist, or running pre-RC backlog. Omit sections that do not apply, but do not omit unknowns or untested states.

## Audit identity

- Product and release candidate:
- Environment and canonical URL:
- Build/version/commit if visible:
- Audit time and timezone:
- Roles and workspaces tested:
- Viewports/devices tested:
- Core routes in scope:
- Mutations authorized:
- Sensitive-data handling:

## Verdict

**Ready | Conditionally ready | Not ready**

State the decisive evidence in two or three sentences. Separate UI readiness from security, data integrity, cross-client parity, deployment, or other release gates that were not tested.

## Stateful checklist

### Authentication

- [ ] Signed-out protected deep link reaches the expected sign-in surface.
- [ ] Intended destination survives authentication.
- [ ] Authenticated landing route, role, and workspace are correct.
- [ ] Protected content does not flash before auth resolution.
- [ ] Refresh restores the session and route without auth flicker.
- [ ] Sign-out clears protected UI and cached state, if authorized.
- [ ] Second-account isolation is verified, if in scope and authorized.

### Route loading

- [ ] Core routes were tested by direct load, client navigation, and refresh.
- [ ] The persistent shell stays mounted when it should.
- [ ] Every route reaches meaningful structure and usable content.
- [ ] No route is blank or indefinitely loading.
- [ ] Route skeletons, local refresh indicators, empty states, and errors match the actual trigger.
- [ ] Stale content is labeled or reconciled safely.
- [ ] Focus, scroll, filters, selection, and unfinished input behave intentionally.
- [ ] Back/forward navigation preserves understandable state.

### Dashboard density

- [ ] Each default module supports a clear operator decision or action.
- [ ] Repeated metrics and navigation shortcuts are consolidated.
- [ ] Urgent exceptions appear before low-value summary content.
- [ ] Data freshness and next actions are clear.
- [ ] The default works without requiring customization cleanup.
- [ ] Lower-priority detail uses progressive disclosure where appropriate.

### Transitions

- [ ] Interaction acknowledgment is immediate.
- [ ] Route changes preserve orientation and stable shell context.
- [ ] Motion reflects spatial meaning and never masks loading failure.
- [ ] No whole-screen flash, duplicate shell, double animation, or layout jump occurs.
- [ ] Focus management and announcements remain accessible.
- [ ] Reduced-motion behavior works.
- [ ] Added libraries, if any, solve an observed gap and have acceptable cost.

### Tours and overlays

- [ ] Callouts avoid targets and viewport edges at supported sizes.
- [ ] Sidebar, modal, scroll, zoom, and dynamic-content combinations were tested.
- [ ] Z-index, clipping, backdrop, portal, and pointer behavior are correct.
- [ ] Keyboard focus and close/skip/back/next behavior are deterministic.
- [ ] Missing or moved targets fail safely.
- [ ] Route changes do not orphan the tour.
- [ ] Reduced-motion and assistive-technology behavior are acceptable.

## Route matrix

| Route | Entry mode | Auth/session | Shell stable | Loading state | Usable result | Time/observation | Evidence | Finding |
|---|---|---|---|---|---|---|---|---|
| `/example` | Cold / client / refresh | Pass / fail / unknown | Yes / no | Skeleton / local / blank / error | Pass / partial / fail | Observed value | Artifact or timestamp | ID or none |

Add one row per route and entry mode. Do not collapse cold load, client navigation, and refresh into a single pass when their behavior differs.

## Running pre-RC backlog

| ID | Severity | Area | Route/state | Finding | User impact | Recommended outcome | Evidence | Owner/status |
|---|---|---|---|---|---|---|---|---|
| UX-01 | Blocker / high / medium / low | Auth / loading / dashboard / transition / tour | Exact state | Concise observed defect | Why it matters | Behavior to achieve, not an assumed implementation | Artifact or reproduction | Unassigned / tracked |

For each finding, retain:

1. Exact reproduction state and steps.
2. Expected behavior.
3. Observed behavior.
4. User and release impact.
5. Evidence source and timestamp.
6. Confidence and any untested variants.
7. Recommended outcome; list a library only after stack fit is checked.

## Release gates and unknowns

- Blocking UX findings:
- High-priority pre-RC findings:
- Untested roles, accounts, devices, viewports, routes, or refresh modes:
- Required human approvals or credential handoffs:
- Non-UX release gates explicitly outside this audit:

## Evidence discipline

Use screenshots or recordings only when they do not expose sensitive content. Prefer synthetic or redacted data. Mark source inspection and inferred root causes separately from deployed observations. Never convert a pending loader, a skipped credentialed test, or a single warm-route pass into a readiness claim.
