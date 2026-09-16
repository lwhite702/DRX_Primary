# DRX Help Center migration validation

Updated 2026-09-16 on `codex/WRE-92-featurebase-help-overhaul` for PR #171 and WRE-123.

## Inventory

- 19 canonical guides audited and generated as MDX.
- 24 Mintlify pages in navigation: 19 canonical guides plus index, beta, glossary, legal, and changelog.
- 20 visual assets: 6 headers, 8 screenshots, and 6 diagrams.
- 23 image placements across the guides.
- 16 Gemini product capture specifications are listed in [GEMINI_SCREENSHOT_BRIEF.md](./GEMINI_SCREENSHOT_BRIEF.md).
- 17 legacy Mintlify routes redirect to the canonical routes.
- No articles were split or archived in this migration. Legacy Mintlify pages are retained as redirects; the 19 canonical article IDs and slugs remain the source of truth.

## Checks

| Check | Result |
| --- | --- |
| `python3 .../skill-creator/scripts/quick_validate.py .agents/skills/help-center-visuals` | Pass |
| `python3 .../skill-creator/scripts/quick_validate.py .agents/skills/help-center-screenshot-capture` | Pass |
| `pnpm docs:mintlify:build` | Pass; 19 guides and 20 assets generated |
| `pnpm test:docs:mintlify` | Pass; 24 pages, 19 guides, 20 assets, 16 capture specs |
| `mint validate` | Pass |
| `mint broken-links` | Pass; no broken links |
| `mint a11y` | Pass with a non-blocking color WARN; MDX and image alt checks pass |
| `pnpm test:featurebase:help` | Pass; 15 tests |
| `pnpm featurebase:validate:help-visuals` | Pass; 20 assets and 23 placements |
| `pnpm docs:audit:features` | Pass; 58 page routes and 92 API routes inspected |
| `pnpm docs:audit:gaps` | Pass; 9 documented product gaps, `mintlifySourceReady: true` |
| `pnpm copy:lint` | Pass |
| `pnpm test:marketing-claims` | Pass |
| `pnpm test:policy` | Pass; no new findings |
| `pnpm test:repo-hygiene` | Pass |
| `pnpm release:integrity` | Pass; documentation-only change, no release implied |
| Desktop dark/light preview | Pass; DRX logo, lime accent, image captions, and article hierarchy checked |
| 390px mobile preview | Pass; article content and navigation drawer checked |

GitHub checks for commit `431bed40c` were not started because the repository's Actions budget is preventing further use. Their failure annotations report the budget gate, not a test failure; the same commands pass locally as listed above.

## Publication status

The repository is ready to supply Mintlify from the `mintlify/` directory. Featurebase remains the feedback and roadmap surface during the transition. No Featurebase API key was used, and no public domain or help-link cutover is claimed here.

Live Mintlify deployment, the DRX-owned docs domain, and public application-link cutover remain unverified. The final publication gate is to connect the correct Mintlify project to this repository, deploy the `mintlify/` directory, recheck the hosted pages, and then update PR #171 and WRE-123 with the live URL and commit evidence.

## Remaining gaps

The gap audit retains nine product documentation gaps: workspace privacy badges, alias-only Quick Create, Purchase orders beta coverage, native distribution evidence, receipt/refund/mixed-payment boundaries, team offboarding, report runtime health, whole-account deletion/export scope, and live Mintlify publication/cutover. The guides intentionally avoid unsupported procedures for those surfaces.
