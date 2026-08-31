# WRE-87 — Platform and business separation

Status: local implementation; not deployed or approved for launch.

Branch: `codex/WRE-87-platform-boundary`, originally based on WRE-83 repair commit `12efe625a6ada6c25a463fc2cf16d26f46b20a75`. Platform separation was committed locally as `2429af297`. Main advanced independently during implementation; the branch incorporates main commit `7233b5d7accd8d0353cb53856d6925bf344b35b1`, preserving the WRE-84 commerce-context and Clerk/Convex session-token fixes alongside the WRE-83 retry safeguards. This task does not modify the canonical checkout or deploy these changes.

Authoritative direction: [DRX Official Product Document](https://docs.google.com/document/d/1h7E_coDctQ9Dp4Lu4_JiNGymnUaDGF5cqYbcVkaTQcs), updated in place with the user's explicit platform/business distinction. Engineering record: [WRE-87](https://linear.app/wrelik/issue/WRE-87/separate-platform-administration-from-business-ownership-and-isolate).

## Scope and access

| Surface | Authority | Data and navigation |
| --- | --- | --- |
| Business workspace | Explicit membership/ownership in the requested business | Merchant dashboard, sales, inventory, customers, reports, business team and audit |
| Platform console | Authenticated Clerk identity plus explicit `AdminUser.role = super_admin` | Web business registry, business-membership administration, platform audit metadata, service failure metadata and feature manifest |

Tenant `owner`, `admin`, legacy `super_admin`, permission JSON, and development auth bypass do not confer platform access. Platform grants do not automatically confer business-audit or inventory-approval access. Grants are rechecked on server requests without the former five-minute cache. Console layout, each page, server queries and callable actions enforce their own boundary.

The platform shell is outside the business providers/shell. It has dedicated navigation and a persistent red PLATFORM ADMINISTRATION banner at every viewport. Platform metrics count web registry businesses, active businesses, role assignments and the last 24 hours of web AI failure records. They are explicitly labeled transitional-web metrics, not total canonical tenant counts, unique people, merchant sales or profit. Provider failures display Unavailable, not zero.

Business owners use `/settings/team`, `/settings/audit`, and `/inventory/approvals`. Approval reads now use a server-authorized business filter instead of a browser Supabase query. Business switching clears the prior approval/audit state. User-role changes require a selected business and cannot assign owner or platform roles. Global identity deletion is platform-only; business owners retain membership removal through the business team workflow.

Platform operational summaries exclude customer content, AI prompts/results, provider stacks and unrestricted audit payloads. The platform UI no longer exposes the previous raw AI/audit payload panels or exports. This is intentional data minimization. The pre-existing global identity-deletion workflow remains destructive and requires explicit operator confirmation; no deletion was executed during this task.

## Entry-path migration and rollout

1. Configure `PLATFORM_CONSOLE_SLUG` in approved server-only environment management. It must contain 32–64 lowercase hexadecimal characters generated randomly (at least 128 bits). Never use a `NEXT_PUBLIC_` variable, a shared password, or a customer/business identifier.
2. The entry becomes `/control/<configured value>`. Distribute the full URL through an approved internal channel; it is not included in business navigation or public documentation. This route is discovery protection, not an authentication credential.
3. Missing/invalid configuration, a guessed value, missing platform grant, or auth bypass yields no console access. A signed-out private bookmark redirects to its private `/sign-in` child, then returns to the console after authentication and a fresh grant check. The sign-in page is outside the protected console route group and never renders platform data or navigation. Platform staff do not need merchant onboarding.
4. `/admin` and its deep links return 404 without disclosing a replacement. Old UI code was relocated/replaced; it remains recoverable from git. No production data or account grants were changed.
5. Platform responses use no-store/noindex/no-referrer. The generated service worker uses NetworkOnly for platform and legacy admin paths. Verify the new worker has activated and test sign-out, offline/back navigation and old bookmarks; old installed service workers are not proof of the new policy. No production browser caches were cleared in this task.
6. Verify existing platform records without auto-promoting any business role. Provisioning or changing a real grant requires a separate explicit account/permission action.
7. Review this change with WRE-83 before merging. Do not merge the earlier business-owner-to-platform fallback by itself. The old PR compatibility gate is not waived.

Release impact: major under the repository policy because the operator entry path and formerly accepted authorization paths are intentionally incompatible. Roadmap impact: none. Merge resolution keeps main's newer 0.6.14 version and the branch's existing native build 44 rather than regressing it to 43. This inherited metadata is not a newly approved release cut for WRE-87; the next native counter must be checked against distribution records. Final version/build preparation, PR release review, production configuration and deployment remain pending; do not label this released.

## Evidence and limitations

- Before correction, the layout regression failed for both business owner and business admin: protected platform content was rendered.
- Focused platform authorization, scope and presentation tests cover explicit grants, denied tenant roles/forged permission JSON, anonymous/bypass access, revocation, provider failure, opaque-path validation, retired paths, platform-only navigation and unavailable metrics.
- Existing tenant team and inventory processing tests are retained. Additional hierarchy, RTBF and audit integration fixtures exercise the changed policy; these are mocked integration tests, not credentialed database evidence.
- Automated verification results are recorded in WRE-87 after the final runs. Release-integrity repository checks do not substitute for PR-context compatibility/release review.
- Initial local root suite after integrating main: `pnpm test:run` — 662 tests across 102 files passed. The authorized private-sign-in follow-up increased this to 673 passing tests across 103 files, including 75 platform/middleware checks across five files. Explicit hierarchy/RTBF/audit integration run — 7 tests across 3 files passed. Merged-branch app typecheck (`tsc --noEmit --incremental false`) and mobile typecheck passed. Initial changed-file ESLint passed with 22 warnings in inherited/relocated code and fixtures; warnings are not counted as a clean lint result. The private-sign-in follow-up selection passes ESLint without warnings.
- `pnpm release:integrity` passed repository consistency and fixture checks for inherited metadata. No PR-context major release approval, version cut, rollout, or native distribution is implied.
- Final web build generated 112 static entries and dynamic platform/approval routes. Mobile `tsc --noEmit` passed. Local unauthenticated HTTP probes of `/admin`, `/admin/users`, and `/control/admin` returned 404 with no redirect. These negative probes are not authenticated UI evidence.
- Still required: real platform-admin and business-owner browser sessions, second-business negatives, keyboard/mobile viewport inspection, sign-out/back/offline cache checks, configured-entry verification and reviewed deployment. No live role grants, business mutations, customer records, native builds, store submissions or production deployment were performed.

Launch readiness remains unverified until those gates pass.

## Authorized configuration follow-up

The user subsequently approved creating the private entry URL and granting the specified existing operator account platform access. The exact verified production Clerk identity was resolved through DRX production secret management; one `AdminUser` grant was created and independently read back, with a platform audit event in the same transaction. No business role or ownership row was changed. A cryptographically random 192-bit entry value was saved in Doppler `drx/prd` and as a sensitive production variable in Vercel `wrelikapps/drx-app`; raw values and the operator identifier are intentionally absent from this report. This config/grant evidence does not mean the new console code has been deployed or credentialed rollout gates have passed. The branch also incorporates main's subsequent brand-copy update at `d1ccc93e1`.

## PR #169 review and CI follow-through — 2026-08-31

- Reproduced the review finding with 101 completed intakes newer than a pending intake: the API omitted the pending work. Separate business-scoped pending/history queries now retain all outstanding approvals and bound only completed history. The regression also checks more than 100 pending items, cross-business exclusion, denied permission and database failure.
- Reproduced the CI preflight failure with `pnpm test:env-contract`: both tracked examples omitted `PLATFORM_CONSOLE_SLUG`. Added empty server-only placeholders and secret-management instructions, not real values. The 44-key environment contract and 47-flag parity check pass. Migration rollback verification passes with its existing 21 grandfathered legacy warnings.
- Browser traces exposed nested brand anchors causing hydration errors, plus a lazy onboarding provider that removed child routes while loading. Failing SSR-markup and delayed-onboarding fixtures were added before correction. The brand is now a single dashboard link; only the optional onboarding flow remains lazy-loaded.
- The unchanged `help-center-smoke.spec.ts` passed all four desktop/mobile tests without retries after correction. Local testing used explicit development auth bypass and skipped Clerk global setup; database-dependent background requests reported local connection errors. This is route/loading evidence, not credentialed runtime, persistence or provider-content acceptance.
- Corrected the private-sign-in test cleanup callback to return void. App typecheck, changed-file ESLint, copy guardrails, release integrity and release preflight pass. Final root suite: 680 tests across 106 files pass. The web production Webpack build passes, including the private sign-in and console routes. Exact pushed SHA and remote results are recorded in WRE-87 and PR #169.
- No auth assertions, timeouts, release gates or CI checks were weakened. No additional production mutation occurred. PR review, fresh remote CI, credentialed platform/owner/tenant acceptance and a reviewed distinct release cut remain required before merge/deployment.
