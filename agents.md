# Wrelik Agent Operating Rules

Version: 1.1
Status: Required for all contributors (human or AI)
Last updated: 2025-10-31 (America/New_York)

This document defines how automated agents (Cursor, MCP agents, AI assistants, etc.) must work in this repository and in all future Wrelik applications.
If an agent cannot follow these rules, the agent should stop and request human guidance rather than guessing.

⸻

## 0. Core Principles

1. **Consistency beats improvisation.**
   All code, file structure, naming, and docs must match the conventions in this file before inventing something new.

2. **Context is sacred.**
   Agents must use all available context (including project guidelines, codebase state, prior architectural decisions, and our product identity) before generating code or docs. Do not "start from scratch" in isolation.

3. **We bias toward open source solutions.**
   If an established, well-maintained open source approach exists, we prefer that over reimplementing non-differentiating features.

4. **Humans should be able to read what happened.**
   Every significant change must carry a clear diff summary: what changed, why, and when.

⸻

## 1. Branch, Commit, and Changelog Rules

### 1.1 Branching conventions

**Branch Structure:**

- `main` - Production-ready code, protected branch
- `development` - Primary integration branch for all feature work
- `feature/<short-description>` - Individual feature branches

**Workflow:**

1. All new work MUST branch from `development`
2. Feature branches merge back to `development` via pull request
3. `development` merges to `main` only for releases

**Naming Examples:**

- Feature work: `feature/inventory-forecasting`
- Bug fixes: `feature/fix-mobile-nav`
- Integration: `merge/feature-x-into-development`

**Critical Rules:**

- Agents MUST NEVER push directly to `main`
- Agents MUST NEVER push directly to `development` without PR review
- All work happens in feature branches
- Only humans can merge `development` → `main` for releases

### 1.2 Commit discipline

Every commit created by an agent must:

- Be focused: a commit should represent one logical unit of change.
- Include a commit message with:
  - A short summary line (max ~70 chars)
  - A body that explains:
    - What changed
    - Why it changed
    - Any new files or deleted files
    - Any known follow-ups / TODOs

### 1.2.1 Commit Granularity Requirement for AI Agents

To maintain traceability and reduce regression risk when AI prompts trigger multi-file or cascading changes, the following rule is binding for automated agents.

**Rule: One Commit Per Logical Change Per Prompt**

- For work derived from a single prompt:
  - Each distinct logical change MUST be committed separately.
  - Examples of distinct logical changes:
    - API route creation or modification
    - Schema or migration updates
    - Component refactors
    - Prompt or agent rule updates
    - Documentation changes

**Guidance:**

- If changes are inseparable and tightly coupled, a single commit is acceptable.
- Agents must err on the side of clarity over minimalism.
- Commit messages must still follow all existing discipline rules.

### 1.3 Changelog discipline

In addition to normal git commits, agents MUST update (or create if missing) a repo-level changelog file:

**CHANGELOG.md**

When an agent makes a non-trivial change (new feature, refactor, structural change, schema change, route added, cron behavior changed, etc.), the agent must append a new entry in CHANGELOG.md under a heading for the current date and time.

Rules for CHANGELOG.md:

- Use the real current timestamp in America/New_York.
- Format:

```
## 2025-10-29 14:52 ET

- [feature] Added /api/mindstorm/recluster endpoint (no auth yet, returns { ok: true })
- [ui] Added <QuickCaptureBar /> to /app with working submit handler
- [infra] Added CRON_SECRET check in /api/cron/test
- [docs] Updated agents.md rules for changelog discipline
- [risk] Vault layout currently still using default AppShell; will diverge later
```

- Do not rewrite older timestamps or reorder history.
- Do not group unrelated changes into one bullet. Clarity > aesthetics.

**Agents must never skip the changelog. The changelog is our historical record of intent.**

### 1.4 Version Management

**Semantic Versioning (SemVer) is required: `MAJOR.MINOR.PATCH`**

All version changes MUST follow semantic versioning principles:

- **MAJOR** (x.0.0) - Breaking changes, incompatible API changes
- **MINOR** (0.x.0) - New features, backwards-compatible additions
- **PATCH** (0.0.x) - Bug fixes, small improvements

**Automated Version Checking:**

Before proposing any pull request, agents MUST:

1. Run `pnpm version:check` to see suggested version bump
2. Update CHANGELOG.md under `[Unreleased]` with categorized changes:
   - **Added** - New features (triggers MINOR bump)
   - **Changed** - Changes to existing functionality
   - **Deprecated** - Soon-to-be removed features
   - **Removed** - Removed features (triggers MAJOR bump)
   - **Fixed** - Bug fixes (triggers PATCH bump)
   - **Security** - Security fixes

**When to bump versions:**

Agents MUST NOT manually edit version numbers in:

- `package.json`
- UI components (`sidebar.tsx`, `bottom-nav.tsx`)

Instead, when ready to release:

1. Ensure all changes are documented in CHANGELOG.md under `[Unreleased]`
2. Run `pnpm version:bump` to automatically update all version references
3. Commit with message: `chore: Release vX.Y.Z`
4. Create git tag: `git tag vX.Y.Z`

**CI Integration:**

The version check workflow runs automatically on:

- All pull requests to main
- All pushes to main

This ensures version consistency and proper changelog maintenance.

**Documentation:**

For detailed version management workflow, see:

- `docs/VERSION_MANAGEMENT.md` - Complete guide with examples
- `scripts/version.js` - Automated version management script

### 1.5 Date Source Verification Checklist (Binding)

Before an agent may write, modify, or append any timestamped or versioned content, including but not limited to:

- CHANGELOG.md
- document headers (Version, Last updated)
- release notes
- governance files
- policy documents
- migration records

the agent MUST complete the following checklist.

**✅ Date Source Checklist**

An agent MAY proceed only if at least one box is explicitly true.

- The human explicitly provided the date or timestamp in the request
  _Example: “The date is 12-27” or “Use today’s date: 2025-12-27”_
- The system runtime provided the current date
  _Example: tool execution context, environment metadata, or system clock surfaced to the agent_
- The date was retrieved from an authoritative repository source via MCP tools, such as:
  _Latest CHANGELOG.md entry_
  _Git commit timestamps_
  _GitHub API metadata_

If none of the above are true, the agent MUST NOT write a date.

**🚫 Explicit Prohibitions**

Agents MUST NOT:

- Infer or guess the current date
- Reuse a prior date without verification
- Assume “today” based on model context
- Backfill timestamps
- Approximate dates or times
- Default to training-era or conversation-era dates

There are no exceptions.

**🛑 Mandatory Halt Condition**

If the checklist cannot be satisfied, the agent MUST stop and respond with:

> Date source not verified. Please provide the correct date or authorize retrieval from repo history.

Proceeding without verification is considered a failed task.

**🔍 Enforcement Clause**

Any output that includes a timestamp or version date without satisfying this checklist is:

- Invalid
- Non-mergeable
- Subject to mandatory correction

This rule applies retroactively to all governance, policy, and changelog files.

Why This Is Important

- Dates are part of the audit trail
- Audit trails must be deterministic
- Determinism requires source-based truth, not inference

This rule treats time the same way you already treat schemas, auth, and secrets: **no source, no write.**

⸻

## 2. Required Use of Context

Agents MUST treat the repository itself as the primary source of truth.

When generating or modifying code:

1. Read existing code in this repo for patterns before generating new abstractions.
2. Reuse existing components, utils, helpers, or styles if they already solve the need.
3. Follow the naming patterns and file locations already in the repo.

When generating new files:

- Place them in folders consistent with our current file organization (e.g. components/, lib/, app/<route>/page.tsx, app/<route>/layout.tsx, types/, etc.).
- Do NOT invent new top-level folders without strong justification.

When defining new function names, types, or prop interfaces:

- Reuse existing naming conventions (camelCase for functions, PascalCase for components, UpperCamelCase for types/interfaces).
- Carry forward existing props patterns (for example: activeRoute, showDemoBadge, etc.) instead of inventing parallel-but-different props.

**Agents MUST assume that "context7" (the high-level product direction and architectural intent we've already discussed in this repo — Klutr / MindStorm / Stacks / Vault / Insights / Memory / Nope) applies to all code going forward.**
If there is an older pattern in the repo that conflicts with context7, context7 wins.

### 2.1 Context7 MCP Requirement

**CRITICAL: Agents MUST use Context7 MCP tools before generating any code that uses external libraries or dependencies.**

Before writing code that imports or uses any external library:

1. Use `mcp_Context7_resolve-library-id` to find the correct library ID
2. Use `mcp_Context7_get-library-docs` to fetch up-to-date documentation
3. Generate code based on the official documentation, not assumptions
4. Include proper imports and usage patterns from the official docs

This ensures all code follows current best practices and API patterns.

### 2.2 Governance Binding

**Agents MUST load and reference these documents before generating any output:**

- `agents.md` (this file) - behavioral standards
- `PRD.md` - product requirements and vision
- `BRAND_VOICE.md` - communication standards and writing guidelines
- `BRAND_GUIDE.md` - comprehensive brand identity and visual guidelines

If any of these files are missing, the agent MUST create them before proceeding with other work.

⸻

## 3. Tooling and MCP Usage

Agents MUST use all available MCP (Model Context Protocol) connectors and automations they have access to when performing work.

Examples:

- If an MCP tool can fetch Figma component specs, use it to align components with design.
- If an MCP tool can call GitHub (list branches, open PRs), use it instead of guessing branch names or file states.
- If an MCP tool can run a file tree or schema inspection, use it before generating new schema changes.

**Rule:**
Never hallucinate missing context that can be pulled via an available tool.
Always attempt to gather first, then generate.

If a tool returns an error or access denied, you MUST:

- Explicitly note that in the changelog description for that work
- Continue with the best information you do have
- Do not silently invent data to "pretend the tool worked"

⸻

## 4. Testing Rules

This is critical.

All agent-driven testing for now MUST assume "browser-level functional testing."

That means:

- The agent should verify that pages render without throwing (no runtime crashes).
- The agent should confirm basic interactions fire handlers without throwing (e.g. clicking "Re-cluster now" logs successfully, submitting QuickCaptureBar doesn't explode).
- The agent should confirm responsive behavior where applicable (sidebar collapses to sheet on mobile breakpoints, etc.).

**Explicitly:**

- Agents MUST NOT generate or rely on Node.js-only headless unit tests as a substitute for checking runtime.
- Agents MUST ensure imports resolve, components compile, pages render, and there are no React runtime reference errors.

When an agent says "tested", that means:

- The app builds in Next.js
- The routes render in a browser-like environment (dev server or equivalent simulation)
- There are no console errors on initial load

If runtime is broken, the agent MUST fix it before committing.

⸻

## 5. Documentation Rules

We distinguish between two types of docs: external (user-facing) and internal (engineering-facing).

### 5.1 External / consumer-facing docs

- All public / user-facing documentation MUST be written for Mintlify.
- That means any docs meant for end users (how to use Vault, how MindStorm works, what Insights means, onboarding "Welcome to your second brain," etc.) must be authored as Mintlify-compatible content.
- Tone: clear, human, non-developer, no internal jargon.
- Agents should create/modify Mintlify content instead of random Markdown guides scattered throughout the repo.

**Rule:**
If you are documenting something a user will see or a user will depend on to use the product, assume Mintlify. Do not put that doc in /docs/internal. Do not bury it in comments.

### 5.2 Internal / technical docs

- All internal technical docs MUST live under /docs/ in the repo root.
- This includes:
  - architectural decisions,
  - API contract notes,
  - data model notes,
  - security considerations (e.g. Vault encryption key handling),
  - background job/cron behavior,
  - environment setup,
  - deployment details,
  - integration notes for pgvector/Prisma/etc.
- These docs MUST be written in Markdown.
- These docs MUST be explicit, not clever, and must document known risks.

Example of good internal doc excerpt:

```
"Vault notes are encrypted client-side using AES-GCM. The server stores only ciphertext and never sees the key. Currently keys are kept in localStorage after unlock. This is a temporary compromise; long term we will migrate to WebCrypto-backed ephemeral keys. Risk: refresh loses key."
```

Agents MUST update /docs/ in the same PR whenever they introduce or change:

- database schema / Prisma models
- API routes under /api/
- cron / background jobs and secrets
- auth/session/data ownership model
- encryption or security-related flows

Do not leave undocumented behavior.

⸻

## 6. Secrets, Cron, and Security

Agents MUST follow these security rules:

1. **CRON_SECRET:**

   - Any cron-like route under /api/cron/\* MUST validate an Authorization: Bearer <CRON_SECRET> header.
   - Agents MUST ensure CRON_SECRET is documented in DOPPLER.md.
   - Agents MUST NOT hardcode actual secrets in code or commit them.

2. **Vault / encrypted notes:**

   - Client-side encryption code MUST be documented in /docs/vault.md (create this file if it does not exist).
   - Agents MUST NOT log plaintext vault contents or derived keys.

3. **API routes:**

   - Before adding a new API route, agent must:
     - Check if an equivalent or similar route already exists in the codebase.
     - Reuse patterns for error handling and response formatting.
   - Every route MUST have a comment describing:
     - Auth assumptions
     - Body shape
     - Response shape
     - Side effects (enqueue jobs, mutate db, trigger AI, etc.)

4. **Environment Variables:**
   - All environment variables are managed via Doppler across all environments.
   - No .env files should be committed to the repository.
   - Reference DOPPLER.md for variable documentation.

⸻

## 7. Open Source First, Always

**Rule Name:** Open Source First, Do Not Reinvent

**Binding Scope:** This rule applies to all current and future work across Klutr, Wrelik projects, and any automated or human contributor.

**Rule Text:**

We default to open source and proven third-party tools.

In the interest of stability, velocity, and long-term maintainability, no feature may be added, rebuilt, or significantly modified without first evaluating existing, well-maintained open source libraries or reputable third-party services that solve the same problem.

Reinventing the wheel is explicitly discouraged for any non-differentiating capability.

A custom implementation is only acceptable when:

- The feature is a core differentiator for Klutr’s product identity, and
- Existing open source or third-party solutions cannot meet privacy, architectural, or UX requirements.

Any decision to build in-house must be documented with:

- What alternatives were considered
- Why they were rejected
- What risks this introduces

Absence of this analysis is considered a failed task.

⸻

### 7.1 Canonical List of Non-Differentiating Capabilities

To eliminate ambiguity and prevent accidental reinvention, the following capabilities are explicitly classified as non-differentiating for Klutr.

Agents MUST evaluate existing, well-maintained open source libraries or reputable third-party services before proposing or implementing any custom solution in these areas.

**Non-Differentiating Capability List (Binding):**

- **Onboarding tours and walkthroughs**
  - Includes guided tours, coach marks, tooltips, first-run experiences, and contextual help systems.
- **Drag-and-drop interactions**
  - Includes list reordering, card movement, drag-to-organize behaviors, sortable layouts, and gesture-based rearrangement.
- **Graph and node-based visualizations**
  - Includes mind maps, relationship graphs, clustering views, force-directed graphs, and canvas-based node editors.
- **Rich text editing**
  - Includes Markdown editors, WYSIWYG editors, hybrid rich-text systems, formatting toolbars, and selection handling.

**Enforcement Rules:**

- Custom implementations for the above are not permitted by default.
- A bespoke solution is allowed only if:
  - The feature is a core differentiator of Klutr’s product identity, and
  - Existing solutions fail to meet privacy, architectural, performance, or UX constraints.
- Any exception MUST be documented in `/docs/` and include:
  - Alternatives evaluated
  - Reasons for rejection
  - Risks introduced by a custom approach

Absence of this analysis constitutes a failed task.

⸻

## 8. Style, Naming, and Structure

Agents MUST:

- Use TypeScript everywhere. No plain .js files.
- Keep React components in PascalCase (NoteCard.tsx, VaultLockScreen.tsx).
- Keep server helpers and utilities in camelCase (reclusterNotes.ts, encryptVaultNote.ts).
- Keep types/interfaces in PascalCase with clear names (NoteDTO, StackSummary, WeeklyInsight).

Agents MUST:

- Keep shared view-layer building blocks (SidebarNav, TopBar, AppShell, cards, grids, lock screens, chips) in components/.
- Keep domain logic helpers (AI prompts, clustering helpers, embedding helpers, cron logic) in lib/ or lib/ai/ or lib/jobs/.
- Keep static / mock data generators in lib/mockData.ts.
- Keep motion constants / variants in lib/animations.ts.

Agents MUST NOT:

- Scatter random util files at the top level.
- Add new folders at the root without documenting why in /docs/architecture.md.

⸻

## 9. When in doubt

If an agent is about to:

- invent a new pattern,
- remove an existing component,
- or change data models,

the agent MUST:

1. Say what it's doing in CHANGELOG.md with timestamp.
2. Update or create the relevant doc in /docs/ explaining the change.
3. Prefer not to introduce breaking changes silently.

If the agent cannot reconcile these rules with the request it was given, it MUST stop and ask a human rather than charge ahead and corrupt the repo.

### 9.1 Stop Condition (Binding)

If an agent lacks required context including, but not limited to:

- Repository access
- MCP tool access
- Required documentation
- Schema visibility
- API surface visibility

The agent MUST halt execution and request the missing context before generating code, prompts, or documentation.

Proceeding with assumptions or best-guess scaffolding is not permitted.

⸻

## 10. TL;DR for Agents

When you (the agent) touch this repo, you MUST:

1. Always read existing code + docs first. Follow them.
2. Always update CHANGELOG.md with a timestamped entry in ET (America/New_York).
3. Always use context7 (our product model: Klutr, MindStorm, Stacks, Vault, Insights, Memory, Nope) when naming pages/components.
4. Always use MCP tools to gather context (Figma, GitHub, repo tree) before generating code.
5. Always use Context7 MCP to fetch library documentation before generating code with external dependencies.
6. Always test in a browser-like environment to confirm the app builds and routes render with no runtime errors.
7. Always put external/user-facing docs in Mintlify format, and put internal technical docs in /docs/.
8. Always prefer open source libraries for non-differentiating features before attempting to write your own.
9. Always protect secrets and cron endpoints with CRON_SECRET.
10. Always load agents.md, PRD.md, and BRAND_VOICE.md before generating any output.

Breaking these rules is considered a failed task.

⸻

## 11. Stop Condition

**CRITICAL:**
If an agent is missing required context (repo access, MCP tool access, required docs, or schema visibility), the agent MUST halt execution and request that context before generating code, prompts, or documentation.

⸻

End of agents.md.
