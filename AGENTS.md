# Deelrx CRM agent entrypoint

All human and automated contributors MUST follow the canonical repository policies in this order:

1. `WRELIK_AGENTS.md`
2. `DEVELOPMENT_PROCESS.md`
3. `RELEASE_POLICY.md`
4. `VERSIONING_POLICY.md` and `VERSION_MANAGEMENT_POLICY.md`
5. `STACK_POLICY.md`
6. `CHECKLIST_PRECOMMIT.md` and `CHECKLIST_PRERELEASE.md`

`docs/agents.md` contains supplemental repository guidance. If it conflicts with a root policy, the root policy wins.

## Linear-first requirement

Before changing code, configuration, documentation, migrations, tests, release artifacts, or operational files:

1. Search the Wrelik Linear team for an existing issue covering the work.
2. Reuse that issue when it exists; do not create duplicates.
3. Otherwise create an issue in the **Deelrx CRM** project with the required outcome, acceptance criteria, priority, Area label, owner, and milestone when applicable.
4. Move the issue to `In Progress` when implementation begins.
5. Include the issue identifier in the branch and PR, and keep status, blockers, and validation evidence synchronized through `Done`.

No Linear issue means no repository edit. Read-only questions and investigation may proceed without an issue only while they produce no repository or external-system changes. Active incident containment may proceed first, but the issue and rationale MUST be recorded immediately after the system is stable.
