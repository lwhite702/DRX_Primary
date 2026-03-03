# Pre-release checklist

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose
Provide a final release gate to reduce production regressions and policy drift.

## Scope
Use this checklist before merging release-bound pull requests or triggering deployment workflows.

## Requirements
- Release metadata MUST be current.
- Critical user paths MUST be validated.
- Compliance and tenant isolation checks MUST pass.

## Checklist
- [ ] Versioning artifacts are complete (changesets/changelog/tag plan).
- [ ] Release notes reflect shipped behavior.
- [ ] Environment matrix documentation matches deployed secrets and config.
- [ ] Database migrations were tested in staging (if applicable).
- [ ] Tenant isolation and access boundaries were verified.
- [ ] Critical smoke paths were validated.
- [ ] Compliance checks passed.
- [ ] No policy exceptions remain undocumented.

## Exceptions
Emergency patches MAY ship with reduced scope checks only if incident notes and a full follow-up validation run are scheduled immediately.

## References
- `./RELEASE_POLICY.md`
- `./VERSIONING_POLICY.md`
