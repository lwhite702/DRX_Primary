# DRX Help Center validation — WRE-92

Status: **repository changes prepared; all 19 articles held from publication**. No live article, collection, slug, order, or draft was changed in this task.

Source: PR [#165](https://github.com/lwhite702/DRX_Primary/pull/165), current `origin/main` at `d1ccc93e1ae18c616b3982036f79aa7122f43ca8`. Dedicated branch: `codex/WRE-92-featurebase-help-overhaul`. Tracking: [WRE-92](https://linear.app/wrelik/issue/WRE-92/audit-and-sync-the-complete-drx-help-center-after-brand-voice-pr-165).

Release impact: none. Roadmap impact: none. Product version remains `0.6.14`; there is no product deployment, release, or distribution claim.

## Scope and counts

- 19 public articles inspected in six collections, with declared public counts checked.
- 100 repository source records reviewed: 34 app-docs files, 16 legacy final files, and 50 seed entries. These overlap the public library; they are not 100 additional live articles.
- 19 canonical articles rewritten; zero left unchanged.
- One proposed retitle: **Standard Sales console → Sales and deliveries (beta)**, ID `7723456`.
- Zero live merges, splits, reorders, archives, deletions, or publications. Existing IDs, public URL segments, collection placement, order, and historical heading anchors are retained.
- 31 old source paths become reference stubs: 15 duplicate app-docs files and 16 legacy final files. Original content remains in Git at the base commit. These are repository references, not deployed redirects.
- The 50-entry legacy seed body is replaced by a canonical content adapter. Its publisher is disabled. No old article is recreated.
- Zero embedded images/videos/iframes in the observed live article bodies; zero introduced. Hardware, camera, printing, and screenshot-related claims were reviewed separately.

## Article-level inventory

The complete [article inventory](article-audit.json) records IDs, old/new titles, full public URLs, URL segments, collection IDs/names, order, old/new links, visual references, heading anchors, emphasized UI labels, source hashes, and source evidence. The [source inventory](source-audit.json) records every repository disposition and incoming documentation references. No raw API response is committed.

| ID        | Article                                                                                                       | Action             | Main correction                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `1633388` | [Get started with DRX](../../app-docs/getting_started/get-started-with-drx.md)                                | update             | Replace obsolete setup with current owner onboarding steps and exact controls      |
| `2502678` | [Dashboard and reports](../../app-docs/feature_overview/feature-overview-dashboard-and-reports.md)            | update             | Remove nonexistent staff/location/date-filter procedure                            |
| `2070517` | [Help and support](../../app-docs/feature_overview/help-and-support.md)                                       | update             | Add verified private support and waitlist destinations                             |
| `3489602` | [Troubleshoot dashboard and reports](../../app-docs/troubleshooting/troubleshoot-dashboard-and-insights.md)   | update             | Remove invented filters and generic retry instructions                             |
| `6417807` | [Privacy and minimal data](../../app-docs/feature_overview/feature-overview-privacy-controls.md)              | update             | Replace Business CRM Mode with Full Customer Mode                                  |
| `3948745` | [Troubleshoot workspaces and access](../../app-docs/troubleshooting/troubleshoot-workspace-and-access.md)     | update             | Add account recovery and membership checks                                         |
| `4735029` | [Switch workspaces and check access](../../app-docs/feature_overview/switch-workspaces.md)                    | update             | Use Select a business / My Businesses and Manage Team                              |
| `1831819` | [Customers and store credit](../../app-docs/feature_overview/feature-overview-manage-customers-and-credit.md) | update             | Explain store account amount owed versus received payment                          |
| `9156766` | [Troubleshoot customers and credit](../../app-docs/troubleshooting/troubleshooting-customers-and-credit.md)   | update             | Remove unsupported customer filters and restore promises                           |
| `6300641` | [Inventory intake and adjustments](../../app-docs/feature_overview/inventory-intake-and-adjustments.md)       | update             | Inventory public name with contextual Add stock, Fix count, Stock history controls |
| `0272622` | [Troubleshoot inventory and audit](../../app-docs/troubleshooting/troubleshoot-inventory-and-audit.md)        | update             | Use exact adjustment action labels and required reason                             |
| `2995914` | [DRX Intelligence](../../app-docs/feature_overview/drx-intelligence.md)                                       | update             | Bound AI beta and service availability                                             |
| `3974136` | [Purchase orders (beta)](../../app-docs/feature_overview/purchase-orders-beta.md)                             | update             | Remove unverified purchase-order creation and receiving UI procedure               |
| `9003136` | [Troubleshoot AI Intelligence](../../app-docs/troubleshooting/troubleshoot-ai-intelligence.md)                | update             | Remove invented filters and universal AI apply/history actions                     |
| `0236106` | [Quick Sale checkout](../../app-docs/feature_overview/quick-sale-checkout.md)                                 | update             | Use current Point of Sale and payment controls                                     |
| `5281725` | [Sales history and receipts](../../app-docs/feature_overview/sales-history-and-receipts.md)                   | update             | Correct recent-50 search scope and Sale Details controls                           |
| `3230948` | [Troubleshoot checkout and payments](../../app-docs/troubleshooting/troubleshoot-checkout-and-payments.md)    | update             | Replace obsolete Standard Sales / Zelle / Mixed troubleshooting                    |
| `7723456` | [Sales and deliveries (beta)](../../app-docs/feature_overview/feature-overview-standard-sales-console.md)     | retitle-and-update | Retitle Standard Sales console to Sales and deliveries (beta)                      |
| `2709969` | [Connect barcode scanners](../../app-docs/integration_guide/connect-barcode-scanners.md)                      | update             | Limit scanner instructions to keyboard-style web input                             |

## Naming, privacy, and release corrections

Use DRX and Deelrx CRM consistently. Inventory remains the public feature name; **Add stock**, **Fix count**, and **Stock history** are contextual UI controls. Current web navigation uses **Point of Sale**, **Orders & Receipts**, **Store Credit**, **Reports**, and **Manage Team**, which replace invented or obsolete menu paths.

Privacy uses **Alias Mode (30 days)**, **Standard Mode (180 days)**, and **Full Customer Mode (365 days)**. The guide explicitly says qualifying inactive customer records are permanently deleted when cleanup runs. It explains custom windows, saved settings, outstanding-balance and legal-hold exclusions, separate temporary-record handling, and the difference between screen masking, cleanup, and downloaded copies. It does not guarantee cleanup execution, recovery, complete account erasure, legal compliance, or every platform’s privacy behavior.

Removed or bounded unsupported claims about native availability, automatic offline sales, universal Android support, purchase-order screens, CSV/bulk intake, AI apply controls, report filters, reprinting/emailing receipts, refunds, mixed/Zelle checkout, instant all-device access revocation, and permanent audit storage. DRX records payments; a selected payment method, edited payment label, delivery adjustment, or receipt preference does not prove money moved or a receipt arrived.

## Links and formatting

- Internal article links: **37 before, 27 after**. The intended graph has no missing IDs, self-links, or cycles.
- Across article destinations, 26 old edges were removed and 15 added, including new support/access destinations. This is a rewrite count, not a claim that all 26 old URLs were dead.
- 15 unique intended destinations checked: 14 HTTPS GETs returned 200, and the support mailto matches canonical contact copy. SMTP delivery was not tested and no message was sent.
- All 19 existing full article URLs returned the correct article ID. No article points to a nonexistent marketing `/support` route.
- The marketing waitlist redirects successfully to the app waitlist with its marketing source parameter. App workflows use named navigation rather than unexplained authenticated deep links. The report CSV explicitly requires sign-in.
- Strict Markdown rendering produces actual headings, paragraphs, numbered steps, bullets, emphasis, links, and retained fragment anchors. Unsupported input is rejected.
- All 19 local HTML previews were opened in the browser and checked for headings, steps, links, and horizontal overflow; none overflowed at the observed desktop viewport. Privacy and checkout previews were visually inspected. No browser console errors or warnings were observed. This is local preview evidence, not final Featurebase rendering evidence.

## Validation results

Commands used Node 22 through `npm exec --yes --package=node@22 -- pnpm …` in this worktree.

| Command                                                                                                                                                      | Result                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `pnpm featurebase:export:help-center --public .featurebase/before`                                                                                           | Pass: six public collections, 19 articles; no API/draft coverage            |
| `pnpm featurebase:validate:help-center`                                                                                                                      | Pass: 19 rendered drafts, 15 destinations; publishReady=false               |
| `pnpm test:featurebase:help`                                                                                                                                 | Pass: 12 tests, zero failed or skipped                                      |
| `pnpm docs:audit:features`                                                                                                                                   | Pass: 54 page routes, 83 API routes                                         |
| `pnpm docs:audit:gaps`                                                                                                                                       | Pass: 100 source dispositions and 20 coverage groups; product gaps retained |
| `pnpm copy:lint`                                                                                                                                             | Pass                                                                        |
| `pnpm test:policy`                                                                                                                                           | Pass: zero current findings                                                 |
| `pnpm test:repo-hygiene`                                                                                                                                     | Pass                                                                        |
| `pnpm release:integrity`                                                                                                                                     | Pass                                                                        |
| `pnpm featurebase:export:help-center .featurebase/before-api`                                                                                                | Blocked: Missing FEATUREBASE_API_KEY; exit 1 before API request             |
| `pnpm featurebase:import:help-center:dry`                                                                                                                    | Blocked: Missing FEATUREBASE_API_KEY; exit 1 before API request             |
| `pnpm featurebase:reorder:help-center:dry`                                                                                                                   | Pass: public order verified; zero changes; not an API reorder claim         |
| `pnpm --filter deelrxcrm-app exec vitest run tests/help/featurebase-taxonomy.test.ts`                                                                        | Pass: 4 tests                                                               |
| `tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck` on the eight changed TypeScript tooling/test files | Pass                                                                        |
| `git diff --check`                                                                                                                                           | Pass                                                                        |

Release-integrity warnings correctly retain external App Store Connect/TestFlight and EAS/Play verification as separate gates. The existing Vite CJS deprecation warning appeared during the taxonomy test. Neither is evidence of a product release. New Help Center tests and gap checks are wired into CI; copy-path triggers now include app-docs and Featurebase audit files. Remote CI is separate from these local results.

## PR compatibility follow-up

The initial remote release check detected an exported-contract regression in the legacy adapter and formatting changes to API-client declarations. The adapter now preserves the original `HelpArticle` interface, typed array and nonempty rendered HTML content. API-client exported declarations retain their original contracts. A fourth taxonomy test covers the HTML compatibility contract. The repository's PR-specific release validator was rerun with the actual base SHA and PR declarations and passed without changing the release gate or requesting a major release. Remote CI rerun status is recorded in the PR.

## Publication blockers and held content

**Exact blocker:** `FEATUREBASE_API_KEY` is absent from the current environment and all four checked DRX Doppler configurations (`dev`, `dev_personal`, `stg`, `prd`). The authenticated export and required API import dry run cannot run. A public export cannot establish the current unpublished/draft inventory or metadata.

All 19 revised articles are intentionally held. The authenticated complete audit, review of any additional/differing drafts, API dry run, publication validation receipt, live import, and post-publication API/public re-export comparison remain outstanding. Do not mark this issue Done or say the Help Center overhaul is complete.

Once the key is supplied through the secure environment, follow [SYNC.md](SYNC.md). Recheck the API and public baselines before any write; the importer now rejects content changed since the audit, missing/moved IDs, unreviewed drafts, and stale dry-run receipts. It never creates articles or silently ignores failed actions. A partial write or a publication mismatch is recorded as a failure requiring review.

## Remaining product and documentation gaps

- **G1 — Workspace overview:** Sample device, location, last-access and privacy data; obsolete preset descriptions and version. Article explicitly directs privacy checks to Settings. Product repair is outside this documentation change. Source: `apps/app/app/(app)/workspaces/_components/WorkspacesClient.tsx`.
- **G2 — Alias-only checkout creation:** Quick Create requires phone although Alias Mode permits aliases only. Guides instruct users not to fabricate or collect prohibited data; use Customers with owner review. Source: `apps/app/components/quick-pos/customer-inline.tsx`.
- **G3 — Purchase orders:** Marketing says beta; no current purchase-order page found. Procedural creation steps withheld; actual receiving documented. Source: `apps/marketing/lib/feature-canon.ts`.
- **G4 — Native distribution and parity:** No verified open iPhone TestFlight distribution or complete Expo/Android acceptance evidence. No install, offline or parity promise published. Source: `apps/marketing/lib/marketing-content.ts`.
- **G5 — Receipt delivery, refunds and mixed payments:** Receipt preference is not delivery confirmation. Current checkout has one cash/card/credit method. Legacy reprint, email, universal refund and mixed/Zelle checkout procedures removed. Source: `apps/app/app/(app)/sales/[id]/page.tsx`.
- **G6 — Team offboarding:** No verified removal/session-revocation UI workflow. Support review replaces invented deactivate button and immediate all-device revocation guarantee. Source: `apps/app/app/(app)/settings/team/_components/TeamClient.tsx`.
- **G7 — Reports and runtime health:** Source verification is not credentialed report or ledger acceptance. Empty Insights is not proof of zero sales. Documented period and CSV controls only. Source: `apps/app/app/(app)/insights/page.tsx`.
- **G8 — Whole-account deletion and exports:** Inactive customer cleanup is narrower than every financial/audit/exported copy. No account-wide recovery, erasure, compliance or encryption guarantee. Source: `apps/app/app/api/privacy/cleanup/route.ts`.
- **G9 — Legacy Moxie and other docs destinations:** This PR updates Featurebase source and tooling only. Moxie/Mintlify synchronization and prior marketing deployment are not implied. Source: `apps/marketing/lib/docs-links.ts`.

These gaps are disclosed or have their unsupported procedures held back; this documentation change does not repair product behavior or establish credentialed workflow parity. The required authenticated Help Center review remains the unresolved publication gate.

## Source authority

The audit used the specified current brand/copy/privacy/onboarding/marketing/mobile/iOS files, the feature canon, VERSION and changelog, current routes and components, and the [official product document](https://docs.google.com/document/d/1h7E_coDctQ9Dp4Lu4_JiNGymnUaDGF5cqYbcVkaTQcs). The older documentation-index governance conflict is recorded in WRE-92/WRE-59; this work does not change approved product or governance direction.

Audit content hash: `96eeb38b615935f3c6eb7d7894e326346e25dac017fa84ee3940ea6b7fd7b596`. Public baseline captured at `2026-08-31T05:35:46.301Z`.
