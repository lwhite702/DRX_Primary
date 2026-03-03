# Wrelik AI agent policy

Status: Active  
Owner: DRX Engineering Team  
Last Updated: 2026-03-02  
Applies To: All Wrelik apps

## Purpose

Define mandatory operating rules for human and AI contributors so changes are consistent, auditable, and safe. This serves as the **global standard** for all Wrelik repositories.

## Relationship to Local agents.md

Each repository SHOULD maintain a root `agents.md` file for project-specific context, goals, and technical debt. However, the root `agents.md` MUST import or reference this `WRELIK_AGENTS.md` as the authoritative source for development process and discipline.

## Scope

This policy applies to all repository changes made by:

- Human developers.
- AI coding assistants.
- Automation agents (CI/CD, bots, scripted migration tools).

## Requirements

- Contributors MUST use established repo conventions before creating new patterns.
- Contributors MUST use available repository context (existing docs, architecture decisions, current code shape) before implementation.
- Contributors MUST produce readable, reviewable diffs with clear intent.
- Contributors MUST avoid direct pushes to protected production branches unless explicitly allowed by repository governance.
- Non-trivial changes MUST include changelog/versioning artifacts required by the repo's release system.
- Each commit SHOULD represent one logical unit of change.
- Sensitive operations (secrets, production config, destructive database actions) MUST require explicit human approval.

## Procedure

1. Create or select a non-protected working branch.
2. Implement one logical change at a time.
3. Run required checks (lint, tests, typecheck, build as applicable).
4. Update release notes artifacts required by the repository workflow.
5. Open pull request with:
   - What changed.
   - Why it changed.
   - Risk level and rollback notes.
6. Merge only after required review and CI checks pass.

## Exceptions

Emergency production mitigations MAY bypass parts of this procedure only when:

- The incident is active.
- A follow-up remediation PR is filed immediately.
- The exception and rationale are documented in post-incident notes.

## References

- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`
- `./VERSIONING_POLICY.md`
- `./RELEASE_POLICY.md`
- `./DEVELOPMENT_PROCESS.md`
