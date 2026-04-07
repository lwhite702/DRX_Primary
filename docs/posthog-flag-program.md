# PostHog Flag Program

## Namespaces
- `feat_<module>_<capability>`: runtime feature controls.
- `exp_<domain>_<hypothesis>`: experiment treatments.
- `beta_<surface>_<cohort>`: controlled beta rollouts.
- `test_<surface>_<purpose>`: staging/test harness controls.
- `ops_<route>_kill_switch`: emergency operational shutoffs.

## Rollout states
1. `off`
2. `internal`
3. `beta`
4. `percent`
5. `global`

## Runtime policy
- Server routes must evaluate flags with `ensureServerFlag`.
- Security-sensitive mutation routes should use `ops_*_kill_switch` flags first.
- Client-side checks are for UI exposure only and must not grant backend authority.

## Experiment workflow
1. Create an `exp_*` flag and owner in the manifest.
2. Launch internal-only.
3. Define success metric + stopping criteria in the experiment ticket.
4. Roll to `percent` when internal validation succeeds.
5. Promote to `feat_*` or remove stale experiment flags by `deprecateAfter`.

## Beta cohort workflow
1. Create a `beta_*` flag.
2. Target by role, business tier, or explicit business/user properties.
3. Keep default disabled.
4. Promote to broader rollout once support + metrics pass.
