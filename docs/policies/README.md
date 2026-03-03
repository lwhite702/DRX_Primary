# Wrelik policy templates

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose

This directory is the canonical source for shared policy and process templates used across Wrelik applications. Teams SHOULD copy these files into new app repositories and fill placeholders without changing policy intent unless approved through governance.

## Scope

This template pack covers:

- Agent operating rules.
- Platform stack standards.
- Versioning and release process.
- Pre-commit and pre-release checklists.
- Integration handoff template for `@wrelik/*` adapters.

## Requirements

- New apps MUST start from this directory (`docs/policies`).
- Teams MUST replace template placeholders before first production release.
- Teams SHOULD keep section structure and RFC-style wording (`MUST`, `SHOULD`, `MAY`) to preserve policy consistency.
- Changes to these templates MUST be reviewed by platform maintainers.

## Procedure

1. Copy `docs/policies` into the target app repository.
2. Fill metadata and placeholders:
   - `Deelrx CRM`
   - `https://github.com/lwhite702/DRX_Primary`
   - `DRX Engineering Team`
   - `../ENV_MATRIX.md`
3. Set policy ownership in each file metadata header.
4. Validate all relative links and checklist references.
5. Submit a PR that includes template adoption plus any scoped, justified deviations.

## Policy catalog

| File                           | Purpose                                                        | Required for new apps | Last updated |
| ------------------------------ | -------------------------------------------------------------- | --------------------- | ------------ |
| `WRELIK_AGENTS.md`             | Rules for human/AI contribution behavior and change discipline | Yes                   | 2026-02-28   |
| `AGENTS_TEMPLATE.md`           | Starter template for project-level `agents.md` files           | Yes                   | 2026-02-28   |
| `STACK_POLICY.md`              | Authoritative vendor and adapter boundaries                    | Yes                   | 2026-02-16   |
| `VERSIONING_POLICY.md`         | SemVer and release artifact requirements                       | Yes                   | 2026-02-16   |
| `VERSION_MANAGEMENT_POLICY.md` | Day-to-day version planning and bump process                   | Yes                   | 2026-02-16   |
| `RELEASE_POLICY.md`            | Release cut process and controls                               | Yes                   | 2026-02-16   |
| `CHECKLIST_PRECOMMIT.md`       | Local quality gate before commit                               | Yes                   | 2026-02-16   |
| `CHECKLIST_PRERELEASE.md`      | Final ship gate before merge/deploy                            | Yes                   | 2026-02-16   |
| `INTEGRATION_TEMPLATE.md`      | Standard adapter integration record for app onboarding         | Yes                   | 2026-02-16   |
| `DEVELOPMENT_PROCESS.md`       | End-to-end development lifecycle and workflow                  | Yes                   | 2026-02-28   |

## Governance

- Template maintainers: `DRX Engineering Team` platform owners.
- Change flow: propose updates via pull request, include rationale, and identify downstream impact.
- Compatibility expectation: maintain backward-compatible template evolution when possible; if policy meaning changes, include migration notes for downstream apps.

## Exceptions

Project-specific exceptions MAY be added in consuming repositories, but each exception MUST include:

- Explicit reason.
- Time bound or review date.
- Approver identity.

## References

- `./WRELIK_AGENTS.md`
- `./STACK_POLICY.md`
- `./VERSIONING_POLICY.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./INTEGRATION_TEMPLATE.md`
- `./DEVELOPMENT_PROCESS.md`
