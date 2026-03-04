# Wrelik AI agent policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-03  
Applies To: Deelrx CRM

## Purpose

Define mandatory operating rules for human and AI contributors so changes are consistent, auditable, and safe.

## Relationship to Local Agent Docs

Repository-specific agent guidance MAY exist (for example `AGENTS.md` or `docs/agents.md`), but those files MUST defer to this file for branching, release, and change-discipline rules.

## Scope

This policy applies to all repository changes made by:

- Human developers.
- AI coding assistants.
- Automation agents (CI/CD, bots, scripted migration tools).

## Branch Governance

- `main` is production and MUST NOT receive direct pushes for standard work.
- `staging` is pre-production and MUST NOT receive direct pushes for standard work.
- `development` is the primary integration branch.
- Feature work MUST branch from `development` and merge back through PR.
- Promotion path MUST be:
- `feature/*` -> `development`
- `development` -> `staging`
- `staging` -> `main`
- Direct pushes to `development` are allowed only for designated maintainers and only for:
- active emergency mitigation, or
- documentation/policy housekeeping.
- Any direct push exception to `development` MUST include rationale and a follow-up PR note.

## Requirements

- Contributors MUST use established repo conventions before creating new patterns.
- Contributors MUST use available repository context before implementation.
- Contributors MUST produce readable, reviewable diffs with clear intent.
- Non-trivial changes MUST include release-note artifacts required by this repo (`CHANGELOG.md`, `VERSION`, and version consistency).
- Each commit SHOULD represent one logical unit of change.
- Sensitive operations (secrets, production config, destructive database actions) MUST require explicit human approval.

## Procedure

1. Create or select a feature branch from `development`.
2. Implement one logical change at a time.
3. Run required checks (`lint`, `typecheck`, `test`, `build`, `test:policy`, and other scoped checks).
4. Update release artifacts required by repo workflow.
5. Open PR to `development` with change summary, rationale, and rollback notes.
6. Promote `development` to `staging` only after checks pass.
7. Promote `staging` to `main` only after staging verification and required approvals.

## Exceptions

Emergency production mitigations MAY bypass parts of this procedure only when:

- The incident is active.
- A follow-up remediation PR is filed immediately.
- The fix is back-ported to `development` right after `main` mitigation.
- The exception and rationale are documented in incident notes.

## References

- `./DEVELOPMENT_PROCESS.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./VERSIONING_POLICY.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
