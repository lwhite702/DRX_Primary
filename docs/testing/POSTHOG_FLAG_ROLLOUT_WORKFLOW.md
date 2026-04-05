# PostHog Flag Rollout Workflow

This repo uses PostHog as the runtime source of truth for feature flags.

## Naming convention

- `feat_<module>_<capability>`
- `exp_<domain>_<hypothesis>`
- `beta_<surface>_<cohort>`
- `test_<surface>_<purpose>`
- `ops_<route>_kill_switch`

## Rollout states

1. `off`
2. `internal`
3. `beta`
4. `percent`
5. `global`

## Ownership metadata

Every flag in `apps/app/lib/posthog/flags-manifest.ts` defines:

- owner/team
- intent
- default state
- optional deprecation date

## Experiment recipe

1. Create `exp_*` flag in PostHog and in manifest.
2. Define target cohort and rollout percentage.
3. Define success metrics and guardrail metrics.
4. Run experiment for a fixed window.
5. Promote winner to `feat_*` behavior and delete stale `exp_*` flag.

## Beta rollout recipe

1. Create `beta_*` flag in PostHog and in manifest.
2. Target by user/account properties (for example role, account size, region).
3. Start at internal cohort only.
4. Expand to selected beta cohorts.
5. Promote to global or retire.

## Ops kill-switch usage

The following kill-switches gate high-risk writes:

- `ops_credit_apply_recommendation_kill_switch`
- `ops_credit_refresh_customer_kill_switch`
- `ops_notifications_alerts_write_kill_switch`
- `ops_notifications_preferences_write_kill_switch`
- `ops_credit_refresh_limits_cron_kill_switch`

During incidents, disable affected routes by toggling corresponding `ops_*` flags to `false`.

## Parity checks

- Internal DB registry parity: `pnpm test:feature-flags-contract`
- PostHog manifest parity: `pnpm test:posthog-flags-contract`

For CI parity checks, configure:

- `POSTHOG_HOST`
- `POSTHOG_PROJECT_ID`
- `POSTHOG_PERSONAL_API_KEY`
