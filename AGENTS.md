# Agent Operating Policy

## Scope and precedence

This file governs all agent activity in this repository. Read it before inspecting, planning, editing, testing, committing, deploying, or documenting work.

A nested `AGENTS.md` may add stricter instructions for its subtree. It may not weaken this policy. Direct user instructions control the assigned task, but they do not authorize unrelated changes, secret exposure, destructive operations, production deployment, or public release.

## Project

- Product: DRX
- Repository: https://github.com/lwhite702/DRX_Primary
- Linear project: https://linear.app/wrelik/project/drx-1de1875e63de
- Official product document: https://docs.google.com/document/d/1h7E_coDctQ9Dp4Lu4_JiNGymnUaDGF5cqYbcVkaTQcs
- Workspace governance: https://linear.app/wrelik/document/product-delivery-and-agent-governance-a75d97052360
- Documentation index: https://docs.google.com/document/d/1t38LOf8CUXsL_RwQ37r8YhOLXb-mR0ey9iZV2OBSnCY
- ClickUp knowledge hub: https://app.clickup.com/9017933906/docs/8cr5g2j-697

## Systems of record

- Google Drive holds approved product requirements, policies, brand standards, and official documents.
- Linear holds engineering work, defects, implementation decisions, dependencies, release gates, and verification evidence.
- GitHub holds source code, repository-local instructions, reviews, version history, and automation.
- ClickUp holds portfolio visibility, operational planning, launch coordination, and non-engineering work.
- ClickUp Docs and Notion hold working knowledge, research, drafts, and evolving notes.

Link to authoritative records instead of copying full documents between systems. If sources conflict, stop and identify the conflict in Linear before implementation. Approved product direction in Google Drive must not be silently overridden by older repository documents, tickets, or comments. Source code remains the truth for what is currently implemented, not what is approved or promised.

## Required work protocol

1. Read this file and every applicable nested `AGENTS.md`.
2. Inspect the repository and relevant authoritative documents before proposing a change.
3. Create or select the correct Linear issue before material code, configuration, schema, infrastructure, dependency, or official-document work.
4. Ensure the issue states the outcome, scope, acceptance criteria, dependencies, risks, and approval requirements.
5. Move the issue to In Progress only when work begins.
6. Include the Linear identifier in the branch, commit, pull request, or change record whenever supported.
7. Make the smallest coherent change. Preserve unrelated edits and existing user data.
8. Run the relevant tests, builds, migrations, security checks, and live workflow checks.
9. Add concise verification evidence to Linear without secrets, personal data, customer content, or unrestricted production payloads.
10. Use In Review when human judgment, external approval, deployment, or release remains. Use Done only when all acceptance criteria are verified.
11. Update the official Google Drive document when an approved product, policy, brand, or operating decision changes. Working notes alone do not amend official direction.

Pure read-only exploration may occur before an issue exists. Once work becomes a proposed deliverable or mutation, issue-first tracking is mandatory.

## Approval boundaries

Explicit user approval is required before:

- destructive or irreversible data operations
- production deployments, App Store or TestFlight releases, or public launches
- account, role, permission, billing, domain, or integration ownership changes
- external messages, invitations, or notifications
- purchases or paid service changes
- changing approved product scope, privacy posture, brand direction, or launch gates

Do not treat access to a tool or credential as approval for a broader action.

## Security, privacy, and compliance

- Never commit or publish credentials, tokens, private keys, signing material, raw environment values, or unredacted configuration.
- Never place customer PII, regulated-retail customer data, recipe contents, source transcripts, private user captures, or unrestricted production payloads in Linear, GitHub, analytics, logs, screenshots, or documentation.
- Use least-privilege access and approved secret management.
- Keep analytics curated and data-minimized. Broad capture, autocapture, session replay, and free-form properties require explicit review.
- Enforce authorization, tenant isolation, encryption, retention, deletion, auditability, and safe failure behavior where applicable.
- Use synthetic or redacted fixtures unless live data is explicitly required and approved.
- Do not bypass tests, authorization, review, feature gates, or release controls to obtain a passing result.
- Never claim an integration, migration, build, or end-to-end workflow works without reproducible evidence.

## Engineering quality

- Follow repository-native architecture, formatting, naming, dependency, and test conventions.
- Prefer root-cause fixes over patches that hide symptoms.
- Validate failure states, retries, offline behavior, accessibility, and privacy boundaries when relevant.
- Treat warnings, skipped gates, mocks, fallbacks, and manual database intervention as disclosed limitations, not success.
- Keep documentation and configuration synchronized with behavior.
- Do not refactor unrelated code during a scoped change.
- Preserve backward compatibility unless the issue explicitly authorizes a breaking change and includes a migration plan.

## Project-specific release policy

- DRX is a privacy-first regulated-retail operating system, not a pharmacy or healthcare product.
- Native iOS and desktop web must support the approved operator workflow without silent platform divergence.
- Tenant isolation, role authorization, customer privacy, financial correctness, inventory integrity, audit events, and safe exports are release gates.
- Validate authentication, onboarding, business setup, users and roles, inventory intake, customer handling, checkout, balances, reports, and audit records end to end.
- Existing tickets and code may retain older technical assumptions. Reconcile them against the current official product document before expanding scope.
- Never place regulated-retail customer records, identifiers, notes, transaction payloads, or decrypted PII in third-party analytics or issue evidence.

## Release integrity gate

For every product-behavior change or any version, changelog, roadmap, release-note, tag, deployment, TestFlight, Play, or Featurebase task, read and follow `.agents/skills/release-integrity/SKILL.md`. Run `pnpm release:integrity`; affected work cannot be reported complete while this gate fails. A passing repository gate does not prove deployment, store distribution, or physical-device behavior.

## Definition of done

Work is complete only when:

- the Linear issue and implemented scope match
- acceptance criteria are satisfied
- relevant automated checks pass
- required live or real-device evidence is recorded
- security and privacy impact has been assessed
- documentation is updated in the correct system
- remaining risks, follow-ups, and manual steps are explicit
- no secret, sensitive content, or unrelated change is included

If any condition is unmet, keep the issue out of Done and state the blocker plainly.
