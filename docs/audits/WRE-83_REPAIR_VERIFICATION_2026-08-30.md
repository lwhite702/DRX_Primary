# WRE-83 repair verification

Date: 2026-08-30. Status: local repairs verified; not merged, deployed, or launch-ready.

Issue: https://linear.app/wrelik/issue/WRE-83/repair-admin-render-crash-and-commerce-reportingretry-regressions

Authoritative product direction: https://docs.google.com/document/d/1h7E_coDctQ9Dp4Lu4_JiNGymnUaDGF5cqYbcVkaTQcs

## Identity and scope

- Baseline: `148b3cf2ff679000122aefd1b76c2da5710f0559`, product 0.6.12, repository iOS build 43.
- Branch: `codex/WRE-83-launch-repairs`.
- Runtime repair commit: `17a2f9f4ac69fbd2fb751fea3df35388c7d5fb64`.
- Included WRE-80 test fix: `e504f6607` (cherry-picked from local `3e05c3bcc`).
- Release impact: patch. Roadmap impact: none. No version cut or native build-counter change has been made.

## Repairs

1. Admin layout: use the supported Prisma `UserRole` delegate instead of nonexistent `BusinessUser`. Existing platform administrators do not require an additional business lookup. Preserve the existing owner/admin predicate and deny anonymous/no-role access.
2. Reporting: include active transitional web sales even when Convex succeeds. Preserve source identity and stable-reference deduplication. When one ledger cannot be read, return explicitly partial results with source availability and accounting warnings. UI labels unavailable source columns; CSV leaves them blank and records availability. If neither source can be read, return a sanitized 503, not fictitious zero totals.
3. Checkout: restore the tenant-scoped completed web-sale lookup before canonical checkout. An already completed web sale is returned on retry without a canonical mutation; a failed lookup prevents another sale.
4. Inventory tests: initialize the complete fixture inside `vi.hoisted` and assert the inventory update and audit delta.

This is not a completed single-store migration. Full POS and ordinary quick web checkout remain active Prisma writers. Removing their data or retry checks before migration would restore the confirmed financial regressions.

## Reproducible verification

Commands ran under Node 22.23.1 in the isolated repair worktree. Tests used synthetic fixtures, not production transactions.

| Check | Result |
| --- | --- |
| New focused regression tests before runtime fixes | 10 failures across admin, reporting, and checkout; admin failure matched production `findFirst` TypeError, digest 973163061 |
| Focused admin/report/helper/checkout/inventory suites after fixes | 27 tests across 5 files passed |
| `pnpm --filter deelrxcrm-app exec vitest run` | 566 tests across 96 files passed |
| `pnpm test:run` | 588 tests across 97 files passed, including 22 mobile math tests |
| `pnpm --filter deelrxcrm-app exec tsc --noEmit --incremental false` | Passed |
| `pnpm --filter deelrxcrm-mobile exec tsc --noEmit` | Passed |
| ESLint on changed runtime and test files | Passed, no reported warnings |
| `pnpm --filter deelrxcrm-app exec next build --webpack` | Passed; 118 static-generation entries completed |
| `pnpm release:integrity` | Passed repository and fixture checks |
| `git diff --check` | Passed |
| Independent Standards / Spec source reviews | 0 / 0 actionable findings |

The production build reused the current generated Prisma client (schema unchanged); it did not rerun `prisma generate`. Dependencies were temporarily linked from the canonical checkout to avoid another large installation. `release:preflight` was not run because it performs an install against those linked dependencies; a frozen isolated install and exact preflight remain required before release. Marketing/native binaries were not rebuilt for these web-only repairs. No bypass-auth test is presented as credentialed evidence.

## Remaining release gates

- PR-context release validation with `Release impact: patch` flags `export-contract-changed:apps/app/lib/reports/commerce-delivery.ts:CommerceDeliverySourceSummary`. The optional `available` property is additive, but the conservative gate requires an explicit compatibility review and matching `scripts/release/breaking-change-review.json` with a real PR review reference. No review approval/reference was fabricated and no gate was weakened.
- `pnpm release:verify` fails: no verified local v0.6.12 tag/GitHub final release and no supplied exact-SHA web, signed native, physical-device, credentialed checkout, or tenant-isolation evidence. This repair is not a release claim.
- Merge, distinct next release identity, production deployment, and subsequent authenticated admin/report/checkout validation require approval and current evidence. Native distribution and device validation remain separate.
- WRE-81 deployment health-probe authentication policy, existing feature-freeze baseline drift, and other audit release gates remain open; this repair does not silently change them.
- `docs/agents/issue-tracker.md` is absent; the review setup helper suggests `/setup-matt-pocock-skills`. Linear was used directly for tracking.

## Preservation

Canonical main remains unchanged. No production data, roles, secrets, deployments, store releases, or public notifications were changed. Build-generated service-worker changes were excluded from the repair and restored to baseline. WRE-83 remains In Review until the outstanding acceptance criteria are verified.

## Push and merge follow-up

The user subsequently approved pushing and merging on 2026-08-30, with the automatic production deployment consequence disclosed. The branch prepares version 0.6.13 and repository iOS build 44. This is not store-safe submission evidence; provider-side version checks remain necessary before any separately approved native submission.

The exact frozen-install preflight is being rerun with independent worktree dependencies. A PR will carry the genuine API-compatibility review requirement; approval will not be fabricated or replaced by a weaker release classification. GitHub branch protection and rulesets return HTTP 403 indicating a plan limitation, so their absence does not waive repository launch gates.
