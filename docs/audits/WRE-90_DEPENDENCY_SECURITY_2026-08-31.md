# WRE-90 dependency security remediation

Date: 2026-08-31. State: branch verification; not released.

Issue: [WRE-90](https://linear.app/wrelik/issue/WRE-90/triage-and-remediate-critical-drx-dependency-alerts-before-launch).
Repository: `lwhite702/DRX_Primary`. Base: `d1ccc93e1ae18c616b3982036f79aa7122f43ca8`.
Branch: `codex/WRE-90-security-deps`. Separate from WRE-87 platform authorization and WRE-85 toolchain work.

## Changes

| Dependency | Previous resolution | New direct pin or transitive floor |
| --- | --- | --- |
| Clerk Next.js, root / app | 6.39.1 / 7.0.8 | 6.39.3 / 7.2.4 |
| Clerk Expo | 2.19.26 | 2.19.36; no Expo SDK major migration |
| Clerk backend/react/shared | Multiple affected versions | Version-scoped overrides for affected major lines; patched transitive versions in lockfile |
| Next.js / eslint-config-next | 16.1.7 / 16.1.6 | 16.2.11 across root and both web apps |
| protobufjs | 7.5.4 | 7.6.5 |
| tar | 7.5.2 | 7.5.21 |
| shell-quote | 1.8.3 | 1.9.0 |
| Vitest, UI, V8/Istanbul coverage | 1.6.1 | All aligned at 3.2.7 |
| Vite | 5.4.21 | 6.4.3, compatible with existing React plugin 4.7.0 |
| HTTP, parser and build transitives | Multiple affected versions | Version-scoped same-major advisory floors; exact resolutions in lockfile |
| Axios, mobile and shared analytics | 1.13.5 | 1.20.0, no request contract change |
| sharp (Next-only override) | 0.34.5 | 0.35.4, libvips 8.18.3 or later |
| deepmerge-ts (Prisma config-only override) | 7.1.5 | 8.0.2 |
| serialize-javascript | 6.0.2 | 7.0.5 |
| Lodash | 4.17.21 | 4.18.1; 4.18.0 has a confirmed modular-template packaging regression |

Vitest now uses `vitest.config.ts` projects while retaining the original `vitest.workspace.ts` export for compatibility. All original app projects remain, and the five shared-package source test files now run as a named project. Their existing local `wrelik-tsconfig-0.1.1.tgz` is explicitly installed as a dev dependency; no shared runtime tarball was rebuilt or changed. All eight excluded shared-package source manifests also pin the patched runner.

Tests add advisory-floor checks against package records in the lockfile, aligned runner/UI/coverage checks, and real installed Clerk route-matcher checks for protected, encoded, nested and query-string paths. These checks do not replace an up-to-date audit or prove deployed authorization. Original public routes, business/platform roles, auth settings, financial behavior, data schema and release counters are unchanged in this dependency branch.

Consumer-specific compatibility: serialize-javascript 7 raises the Node minimum to 20; this repository already requires Node 22. A real Workbox/Rollup worker minification test exercises its serialization path. deepmerge-ts 8 changes deep Map merging and deepmergeInto behavior; the only overridden parent is Prisma 7.3 configuration loading, whose repository-owned config uses plain records, not those APIs. Prisma generation and a real config-loading test verify the actual consumer. sharp 0.35 removes Node 18 and deprecated image APIs; Next 16.2.11 does not call those removed APIs, both app configs retain `images.unoptimized: true`, and the test resolves sharp through Next and resizes a synthetic PNG using Next's optimizer. These bounded checks do not prove every image format or native deployment.

The production-build regression `assignWith is not defined` was minimized to Workbox template population and then directly to Lodash 4.18.0's modular `template` entrypoint. The published 4.18.1 package fixes the missing import. A Workbox template regression test failed twice before this fix and passes afterward; PWA generation remains enabled. No instrumentation or dependency source patch was retained.

Release impact: patch (compatible runtime security fixes; test-only major upgrades do not change a public application contract). Roadmap impact: none. Inherited 0.6.14/native counter 43 is not a new release cut or verified next store version.

## Verification

Node 22.23.1, pnpm 9.15.9. No production credentials or auth bypass used for these checks.

| Check | Result |
| --- | --- |
| Frozen install and Prisma generation | Pass |
| `pnpm test:run` | 713 tests / 106 files pass, including 13 shared-source tests, 14 real-SDK route-matcher checks, 70 dependency checks and four real consumer tests |
| `pnpm --filter deelrxcrm-app test:coverage` | 678 tests / 100 files pass on rerun; all existing thresholds pass unchanged; intermittent mocked push-dispatch failure disclosed below |
| Coverage | Statements/lines 41.62%, branches 70.41%, functions 61.69%; includes untested source files |
| `pnpm test:integration` | 99 tests / 17 files pass, including seven actual integration suites; mocks/ephemeral fixtures are not live acceptance |
| Full web app, marketing and mobile typechecks | Pass |
| `pnpm build` | Both production builds pass after the Lodash/Workbox fix; app 118 and marketing 31 static-page generation entries |
| New-test ESLint | Pass |
| Environment contract / repository security scan | Pass; 43 runtime environment keys checked; scanner is not a dependency audit |
| `pnpm release:preflight` / `pnpm release:integrity` | Pass; provider-side native counters and distribution remain unverified |

Vitest 3 uses different coverage remapping from Vitest 1; changed percentages do not establish added product coverage. No threshold, include list, existing test, security rule or release gate was weakened. Generated service-worker and scanner outputs were restored to their prior tracked state after local checks.

## Advisory evidence and remaining launch gates

Baseline registry audit: 7 critical / 121 high / 110 moderate / 11 low. Initial critical-only patch: 0 critical / 97 high / 100 moderate / 11 low. Extended security patch audit: 0 critical / 2 high / 6 moderate / 1 low. These are registry audit findings, not GitHub manifest alert counts or proven exploit incidents. Default-branch Dependabot alerts cannot close from an unmerged branch.

Primary sources reviewed:

- [Clerk route matching](https://github.com/clerk/javascript/security/advisories/GHSA-vqx2-fgx2-5wq9) and [combined authorization predicates](https://github.com/clerk/javascript/security/advisories/GHSA-w24r-5266-9c3c).
- [protobuf code execution](https://github.com/protobufjs/protobuf.js/security/advisories/GHSA-xq3m-2v4x-88gg) and [Any expansion denial of service](https://github.com/protobufjs/protobuf.js/security/advisories/GHSA-wcpc-wj8m-hjx6).
- [tar decompression](https://github.com/isaacs/node-tar/security/advisories/GHSA-23hp-3jrh-7fpw) and [recursive member selection](https://github.com/isaacs/node-tar/security/advisories/GHSA-r292-9mhp-454m).
- [shell-quote escaping](https://github.com/ljharb/shell-quote/security/advisories/GHSA-w7jw-789q-3m8p) and [parse denial of service](https://github.com/ljharb/shell-quote/security/advisories/GHSA-395f-4hp3-45gv).
- [Vitest UI advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) and [v3 migration guide](https://v3.vitest.dev/guide/migration.html). The package audit uses a 3.2.6 security floor; 3.2.7 satisfies it despite the maintainer page listing an earlier floor.
- [Next.js 16.2.11 security release](https://github.com/vercel/next.js/releases/tag/v16.2.11), [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) and [0.35 migration changes](https://sharp.pixelplumbing.com/changelog/v0.35.0/).
- [deepmerge-ts advisory](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx) and [v8 changes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0); [serialize-javascript v7 compatibility](https://github.com/yahoo/serialize-javascript/releases/tag/v7.0.0).
- [Lodash 4.18.1 packaging correction](https://github.com/lodash/lodash/releases/tag/4.18.1).

Remaining gates, not waived:

- Both remaining high findings are image-size 1.2.1 through Expo/Metro: [ICNS loop](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [SVG recursion](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), with no published fix in the registry audit. Metro's asset loader reads local build inputs and calls this parser; the extension list excludes ICNS but includes SVG, and extension filtering alone does not prove content safety. No first-party direct parser import was found. A supported upstream update or approved, tested build-input mitigation is required; neither advisory is suppressed or waived.
- Six moderate findings remain in esbuild 0.21.5 and legacy uuid versions; cookie 0.5.0 remains low severity. Major parent/legacy integration upgrades still need compatibility review.
- Frozen install reports existing shared-auth Clerk v4 and optional wallet/native peer mismatches, deprecated packages and ignored dependency build scripts. Exact security overrides additionally narrow broad peer declarations for WebSocket, picomatch and OpenTelemetry consumers, producing peer warnings despite patched installed versions. These warnings are not suppressed; successful builds/types do not establish native runtime or every peer combination.
- One coverage run observed six mocked push sends instead of three in `commerce-delivery.test.ts`; the unchanged full unit and coverage reruns pass. The Convex test scheduler pumps all fake timers while asynchronous work runs, potentially expiring a two-minute dispatch lease during synthetic time advancement. This is an unconfirmed test-timing diagnosis, not proof of a production duplicate-delivery defect or a resolved flake; retain it for focused follow-up.
- The local WRE-87 combination is verified below; credentialed platform-grant versus business-owner acceptance is still required. This independent main-based PR retains the old admin implementation until WRE-87 is integrated; do not treat it alone as the platform repair.
- Require exact-SHA CI/review, credentialed browser checks, two-account tenant isolation, native device auth, a distinct reviewed release cut, approved deployment, and post-merge/default-branch audit verification before Done.
- Linear currently attaches this DRX issue to an automatically created Sporkd GitHub issue. DRX repository targeting is explicit here; the unrelated issue/integration was not mutated.

Verdict: critical dependency repairs are prepared and locally tested. Launch is still blocked; no production deployment, account change, native submission, release tag or customer publication occurred in this work.

## Combined platform-boundary verification

An unpublished local merge `ca84a674ba16573480b98e59dd9f573bf547b4e7` combines WRE-90 source `a51b10a1b3e84e74fc41f74aee913c0fc20f875d` with PR169/WRE-87 `38492509283ae1dd532b774eff5c70c6aac8b990`. The only merge conflict was the leading changelog; both entries were preserved. The dependency manifests and lockfile are identical to WRE-90. Lockfile SHA-256: `18f01a3f0330fc8b30b18cf1490c9e9ec94c63a692ab0b08de53808dc65e5d4e`.

- 848 tests / 115 files pass, including the 67 direct platform-page authorization tests, tenant-role negatives, private sign-in, red banner and separate navigation checks.
- 109 integration/auth tests / 17 files pass; these still use mocked/ephemeral boundaries.
- App typecheck and changed-test ESLint pass. Both production builds pass (app 112 static generation entries plus dynamic console routes; marketing 31 entries).
- Release integrity and the 44-key environment contract pass. The combined PR-context validator reports zero errors with the required **major** impact; WRE-90 alone passes as **patch**. Inherited native counter 44 is not provider-side release evidence.
- The built standalone server, without credentials or auth bypass, returns empty HTTP 404 responses with no Location header for `/admin`, `/admin/users` and `/control/admin`. This verifies retired/guessed entry denial, not successful authenticated access.
- The final registry audit remains 0 critical / 2 high / 6 moderate / 1 low. No advisory, coverage threshold or auth assertion was waived.

The local merge is retained only as reproducible integration evidence; it was not pushed, merged into main, or deployed. The worktree was returned to the WRE-90 branch, and only its own generated service-worker/scanner artifacts were cleaned up. PR170's prior head `592b98688` passed all remote checks before this update; new-head CI and human review remain required.
