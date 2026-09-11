# Staging recovery (WRE-114)

Status: implemented locally; deployment and live acceptance pending.

Tracking: https://linear.app/wrelik/issue/WRE-114/restore-staging-promotion-and-isolate-staging-deployments

## Observed configuration

On 2026-09-05, `main` was `c48818beb`, `development` was `c4ff6abb8`,
and `staging` was `124de5495`. Development contained main plus 41 commits;
staging was 222 commits behind main. PR #180 promotes development to staging.
These are a historical snapshot, not a live release claim.

The previous staging workflow listened to development CI and checked out the
default branch, with a production Convex key fallback. GitHub listed deployment
secrets under Production but no dedicated staging app environment. Branch
protection inspection returned a plan-related 403; policy is mandatory but must
not be described as technically non-bypassable.

## Deployment repair

The workflow now requires successful CI Gate from a same-repository staging
push, checks out that exact SHA, and rejects a superseded staging head before
installation and again immediately before deployment. Deployments serialize
without interrupting an in-flight backend deployment. Only dedicated staging
secret names are read. Frozen dependency installation and the pinned Vercel CLI
match the current production deployment tooling; Vercel deploy uses preview mode.
Health validation requires JSON with a healthy database, not merely HTTP 200.

The workflow deploys the operator app and Convex backend. Marketing preview
checks remain separate. Database health does not establish checkout, Convex
identity, persistence, or tenant-isolation acceptance.

## Configuration and activation gate

Before activation, obtain approval for environment/integration configuration and
verify the actual provider targets. Do not copy production credentials or data.
The GitHub `staging` environment must contain these dedicated secrets:

- `CONVEX_DEPLOY_KEY_STAGING`
- `VERCEL_TOKEN_STAGING`
- `VERCEL_ORG_ID_STAGING`
- `VERCEL_PROJECT_ID_STAGING`
- `VERCEL_SCOPE_STAGING`

Verify the Vercel staging project's preview configuration points to the intended
non-production Convex, Clerk and transitional database targets. Validate auth
issuer/JWT configuration and required server-only settings without printing
values. A staging secret name alone does not prove environment isolation.

GitHub reads `workflow_run` definitions from the default branch. Consequently,
merging this repair into development or staging alone does not activate it.
Review a separate workflow-only default-branch integration with the user before
execution: the existing main CI completion also triggers production deployment.
Do not promote the 1.0.0 product changes merely to activate this workflow.

Reference: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run

## Acceptance after promotion

1. Verify all required promotion checks on the current head before merging #180.
2. Record the resulting staging SHA and its post-merge CI result.
3. After approved configuration and activation, verify the deployment's source
   SHA and backend target, then health at the actual deployment URL.
4. Using synthetic accounts, validate sign-in, onboarding/business setup, team
   roles, inventory intake, customer handling, checkout, balances, reports and
   audit history, including second-tenant denial and platform/owner separation.
5. Keep WRE-114 open until this evidence exists. Prepare a separate staging-to-main
   review only after staging acceptance; production promotion remains separately
   approved.

The dirty shared main checkout must remain untouched. This repair uses an
isolated worktree and introduces no product version or native build-number change.
