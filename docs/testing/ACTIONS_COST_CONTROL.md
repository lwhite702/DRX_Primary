# Actions cost controls

Tracked in WRE-93; companion Sporkd work is WRE-94. These controls reduce repeated setup and obsolete runs, not test coverage or release requirements.

## Full validation

CI Gate uses six jobs instead of seventeen job executions:

| Job | Retained checks |
| --- | --- |
| changes | Change-routing/failure fixtures and complete release-integrity command chain |
| quality | Release preflight/frozen install, repository audit and test matrix, policy, hygiene, marketing claims, environment contract, flag parity, migration rollbacks, lint, typecheck, build, auth/data, integration, security, performance |
| unit | Full Vitest suite once instead of two shards; strict coverage gate |
| required-ux | Required E2E, visual, accessibility; existing advisory Quick POS and accessibility checks |
| auth-e2e | Existing credential-guarded authenticated E2E and evidence |
| report | Fail-closed aggregation using Node built-ins, without installing dependencies |

Dependency installation occurs in at most four jobs, including credentialed auth E2E. Preflight performs quality's frozen install. Advisory checks retain their existing status; their outcomes are included in the aggregate. Required commands are blocking. Consolidation trades some parallelism for lower total runner time.

Every main/development/staging push and manual CI Gate run receives full validation. Deployment workflows and their CI-success prerequisites are unchanged. Version Check continues separately, including PR release/roadmap declarations.

## Documentation-only PRs

Only a complete PR diff containing ordinary `.md` files at the root or under `docs/`, `app-docs/`, `.agents/`, `.claude/`, or `.github/PULL_REQUEST_TEMPLATE/` qualifies for the fast path. Runtime paths, MDX, assets, configuration, scripts, dependency files, mixed diffs, empty diffs, and unknown paths require full validation. Missing history or invalid event data also requires full validation. Rename detection is disabled so removing a source file by renaming it into documentation cannot escape testing.

These PRs retain release integrity and a real aggregate check. Heavy runtime jobs are explicitly marked skipped, not reported as executed. Pushes never use this exemption. The independent Supabase/browser E2E workflow uses the same classifier.

## Cancellation, native checks, and storage

- New commits cancel superseded CI, E2E, version, copy, and native validation for the same PR/ref. Do not cancel signed release/upload jobs to save minutes.
- Jobs have explicit time limits. The aggregate and diagnostic uploads do not allocate more work after cancellation.
- Native `xcodebuild test` still builds the application and runs unit/UI tests; the preceding separate build is removed. Native-only Markdown edits do not start macOS validation.
- PR native simulator zip packaging is omitted; main/manual builds still retain downloadable simulator apps. Unit/UI results and failure logs remain available.
- Diagnostic artifacts expire after seven days. No existing evidence is deleted; source, releases, and store distribution are unaffected.

## Validation and measurement

Run `node --test scripts/testing/ci-policy.test.mjs`, `pnpm release:integrity`, and `actionlint` on changed workflows. When changing job composition, compare every previous test command against its new location and retain fail-closed aggregate fixtures. The known Sporkd missing release-integrity implementation remains WRE-88; it is not waived by these controls.

Two sampled successful DRX CI runs on 2026-08-31 used 37.5 and 40.8 summed runner-minutes across seventeen jobs. Repeated setup in removed jobs accounts for roughly ten minutes. A separate sampled E2E run used thirteen minutes. These are job durations, not billing amounts or measured savings; confirm after the updated workflows run successfully. The account's Actions cap was blocking execution during implementation, and no spending limit was raised.

GitHub references: [workflow conditions and concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching), and [artifact retention](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts).
