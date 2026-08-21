---
name: production-readiness-ux-audit
description: Audit a deployed release candidate for authenticated UX readiness across auth state, route loading, dashboard density, transitions, refresh behavior, and guided-tour overlays. Use for pre-RC or production-readiness UI reviews that need reproducible evidence and a prioritized backlog; do not use as a substitute for security, data-integrity, or full end-to-end release validation.
---

# Production Readiness UX Audit

Audit the real candidate build as a stateful operator journey, not as a collection of screenshots. Separate what is observed in the deployed UI from source, build, test, or inferred evidence.

## Establish the audit boundary

Record the exact environment, URL, build/version, role, tenant or workspace, viewport/device, and time. Identify the core route set and the expected authenticated landing route before testing.

Start read-only. Do not create invitations, transactions, customer data, role changes, or other production mutations unless the user explicitly authorizes the exact action. Keep credentials, customer content, and sensitive payloads out of screenshots and reports. Let the user enter credentials; resume from the authenticated session they provide.

If the candidate identity, environment, role, or route scope is unknown, report the gap instead of treating a convenient surface as authoritative.

## Run the audit in state order

### 1. Authentication and session state

Exercise auth as a state machine:

- Open a protected deep link while signed out. Confirm the real sign-in surface appears and preserves the intended post-auth destination.
- After user sign-in, confirm the redirect lands on the expected route with the correct role, workspace, and navigation shell.
- Watch for protected-content flashes, auth loops, wrong-tenant content, duplicate shells, or an indefinite auth loader.
- Refresh a protected route and verify session restoration without a sign-in flash, route loss, or full application reset.
- When authorized and relevant, verify sign-out clears protected state and a second account cannot inherit the prior account's UI or cached data.

Do not call authentication ready merely because the sign-in page renders or a warm session opens one route.

### 2. Route loading and refresh semantics

Sweep each core route in at least three modes when practical: direct cold load, in-app navigation, and browser refresh. Also check back/forward navigation where it is part of the product flow.

For every route, record:

- whether the persistent shell remains stable;
- time to meaningful structure and time to usable content;
- whether the UI uses a route skeleton, a local data-refresh indicator, an empty state, or an error state;
- whether stale content remains understandable while fresh data loads;
- whether focus, scroll, filters, selected workspace, and unfinished input survive navigation as intended;
- whether the result is usable, blank, partially rendered, or stuck loading.

Treat these as distinct failures: a blank route, an indefinite loader, a whole-shell reload, auth flicker, layout shift, misleading empty state, silent stale snapshot, and controls that remain disabled after loading. Repeatedly waiting is diagnostic evidence, not proof that the state will eventually resolve.

Classify the trigger before recommending a loader:

- **Document/application load:** a route-level skeleton may be appropriate while structure is unknown.
- **Client-side route transition:** keep the shell and stable context mounted; transition only the changing region.
- **Background data refresh:** retain usable content and show a local, non-blocking refresh state.
- **Mutation:** show pending state at the affected control or region, prevent unsafe duplicates, and reconcile the result explicitly.

### 3. Dashboard density and relevance

Inventory every visible module, metric, alert, shortcut, customization control, and repeated navigation action at the tested viewport. Map each item to the operator decision or task it supports.

Flag:

- the same fact or action appearing in multiple modules;
- low-priority metrics displacing urgent operational work;
- dashboard shortcuts that merely duplicate persistent navigation;
- dense cards with no clear action, owner, or freshness signal;
- important exceptions hidden below decorative or low-value content;
- customization that adds complexity without producing a coherent default.

Recommend a default hierarchy based on urgency, frequency, and actionability. Prefer progressive disclosure or secondary views for lower-priority detail. Do not prescribe a fixed card count without evidence from the product's roles and workflows.

### 4. Transitions and perceived continuity

Observe route-to-route, panel, modal, tab, and state-change transitions under both warm and delayed loading. A transition passes when it preserves orientation, responds promptly, and does not disguise an unresolved load.

Check for:

- immediate input acknowledgment;
- stable navigation and page frame;
- a clear relationship between outgoing and incoming content;
- no double animation, flash, jump, or blocking full-screen spinner;
- focus placement and announcements that remain accessible;
- `prefers-reduced-motion` behavior;
- animation that is interruptible and does not delay interaction.

Choose fade, slide, scale/minimize, or no motion according to spatial meaning and platform conventions. Before adding a dependency, inspect the existing stack and native capabilities; propose an open-source library only when it closes a demonstrated gap, and record maintenance, accessibility, bundle-size, and integration costs.

### 5. Tour and overlay collisions

Run tours and contextual overlays on each supported viewport, including with the sidebar open or collapsed, scrolled content, dialogs, dynamic data, zoom, longer text, and missing or moved targets.

Verify:

- the target remains visible and is not obscured by the callout;
- placement flips or shifts at viewport edges;
- backdrop, z-index, clipping, portal boundaries, and pointer behavior are correct;
- keyboard focus is trapped only when intended and returns correctly;
- Escape, Skip, Back, Next, and close actions are reachable and deterministic;
- the underlying workflow is not accidentally activated;
- the tour recovers when a target is absent or the route changes;
- motion and announcements are accessible.

Capture collisions as state combinations, not vague styling defects: route + viewport + shell state + target + step + overlay state.

## Build the verdict and backlog

Use observable evidence for every material claim. A route passing once in a warm session does not prove refresh restoration, cold-load behavior, other roles, or other accounts.

Prioritize findings by user impact and release risk:

- **RC blocker:** prevents authentication, traps the user, exposes the wrong scope, leaves a core route blank or indefinitely loading, or blocks a critical workflow.
- **High:** makes a core workflow look failed, causes repeated whole-screen resets, creates serious orientation/accessibility problems, or obscures urgent actions.
- **Medium:** significant redundancy, density, inconsistent loaders, avoidable transition friction, or overlay collision with a viable workaround.
- **Low:** localized polish that does not impede comprehension or completion.

For a formal audit or running pre-RC list, read [references/report-template.md](references/report-template.md) and use its route matrix and finding schema. End with one of: **Ready**, **Conditionally ready**, or **Not ready**, followed by the exact blockers, untested states, and approvals still required.
