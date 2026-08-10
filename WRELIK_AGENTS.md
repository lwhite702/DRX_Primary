# Wrelik AI agent policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-07-17
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

- Every repository change MUST be backed by a Linear issue in the Wrelik team's **Deelrx CRM** project before editing begins.
- Contributors MUST search Linear and reuse an existing issue before creating a new one.
- The Linear issue MUST define the outcome and acceptance criteria and MUST have an owner, priority, status, and exactly one Area label whenever an Area applies.
- Release-bound work MUST include the applicable milestone and `Release Gate`; real authenticated or persistent-data validation MUST also include `Live E2E`.
- Contributors MUST keep Linear synchronized: `Todo` before commitment, `In Progress` during implementation, `In Review` during PR/QA review, and `Done` only after acceptance criteria and required evidence are complete.
- Branches and PRs MUST reference the Linear identifier. The preferred branch pattern is `feature/WRE-123-short-description`; production hotfixes MAY use `hotfix/WRE-123-short-description`.
- Blockers, scope changes, validation evidence, and follow-up work MUST be recorded on or linked from the Linear issue.
- Automated agents MUST report the Linear issue link in their final handoff.
- Contributors MUST use established repo conventions before creating new patterns.
- Contributors MUST use available repository context before implementation.
- Contributors MUST produce readable, reviewable diffs with clear intent.
- Non-trivial changes MUST include release-note artifacts required by this repo (`CHANGELOG.md`, `VERSION`, and version consistency).
- Each commit SHOULD represent one logical unit of change.
- Sensitive operations (secrets, production config, destructive database actions) MUST require explicit human approval.

## Procedure

1. Search Linear and select the existing Deelrx CRM issue, or create one if none covers the work.
2. Confirm the issue scope, acceptance criteria, owner, priority, Area label, milestone, and dependencies; move it to `In Progress`.
3. Create or select a feature branch from `development` that references the Linear identifier.
4. Implement one logical change at a time and keep blockers or scope changes synchronized to Linear.
5. Run required checks (`lint`, `typecheck`, `test`, `build`, `test:policy`, and other scoped checks).
6. Update release artifacts required by repo workflow and attach validation evidence to Linear.
7. Open PR to `development` with the Linear identifier, change summary, rationale, validation evidence, and rollback notes; move the issue to `In Review`.
8. Move the issue to `Done` only after its acceptance criteria are met and the change is accepted or merged.
9. Promote `development` to `staging` only after checks pass.
10. Promote `staging` to `main` only after staging verification and required approvals.

## Exceptions

Emergency production mitigations MAY bypass parts of this procedure only when:

- The incident is active.
- A follow-up remediation PR is filed immediately.
- The fix is back-ported to `development` right after `main` mitigation.
- The exception and rationale are documented in incident notes.
- A Linear incident/remediation issue is created or updated immediately after containment and linked to the mitigation.

Read-only questions and investigations MAY proceed without a Linear issue only while they make no repository or external-system changes. If implementation begins, the issue MUST exist before the first edit.

## References

- `./DEVELOPMENT_PROCESS.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./VERSIONING_POLICY.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./RELEASE_POLICY.md`
- `./AGENTS.md`
