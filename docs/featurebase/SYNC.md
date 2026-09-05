# DRX Help Center sync

WRE-92 establishes one publication source: `help-center-manifest.json`. It lists the 19 existing DRX article IDs, canonical `app-docs` paths, public URL segments, collection IDs, and observed public order. Article titles are content, not identity.

Never recursively import `app-docs`, the historical `docs/help-center-export` tree, an archive, or the old 50-entry seed list. The legacy app-level publisher now exits with instructions instead of writing. Its content adapter reads the canonical manifest for taxonomy tests.

## Choose an authenticated path

Run commands at the repository root with Node 22 and the repository's pnpm version. The Help Center supports two authenticated publication paths:

- Use the API workflow when `FEATUREBASE_API_KEY` is available through the approved secret manager.
- Use the browser workflow when the account can edit Featurebase articles but cannot create or read an API key.

The browser workflow is a supported alternative. Its evidence comes from the authenticated article dashboard, saved draft reloads, a browser receipt, and a fresh public export after publication.

## API export

Do not paste `FEATUREBASE_API_KEY` into chat, commands, reports, or committed files. The default API version remains `2026-01-01.nova`.

```sh
pnpm featurebase:export:help-center
```

The API exporter verifies the DRX Help Center ID, follows pagination, reads each article's selected state, and exports differing drafts separately. Exports go under ignored `.featurebase/`; never commit raw API responses. An export must succeed before an API dry run or publication can be described as verified.

The public export supports both workflows:

```sh
pnpm featurebase:export:help-center --public .featurebase/before
```

It reads the public collection pages and all linked articles. It records IDs, public URL segments, descriptions, bodies, order, links, visuals, headings, and emphasized labels, and checks collection counts. It **cannot** inspect hidden collections, unpublished articles, draft changes, or API metadata. By itself it satisfies neither publication workflow.

`publicSlug` is the last segment observed in the public URL. It is deliberately separate from the API's `slug` field. Do not infer one from the other. The importer preserves the API slug and checks the original public URL after publication.

## API review and dry run

Review the complete API export against the manifest and `source-audit.json`. Every additional live or unpublished article needs an explicit disposition before proceeding. Add reviewed unpublished IDs to `unpublishedArticles` in the manifest only after inspecting them; they are left untouched. Do not clear a differing-draft warning without reviewing the draft.

Update `audit-review.json` only from fresh evidence. Its current incomplete-API flag and unresolved gate deliberately block publication. It is not an approval substitute.

```sh
pnpm featurebase:import:help-center:dry
pnpm featurebase:reorder:help-center:dry
pnpm featurebase:validate:help-center
pnpm docs:audit:features
pnpm docs:audit:gaps
pnpm copy:lint
pnpm test:featurebase:help
pnpm test:policy
pnpm test:repo-hygiene
pnpm release:integrity
```

Import defaults to dry run, including the command without a suffix. It matches only existing IDs and never creates, deletes, archives, or moves articles. A missing ID, foreign Help Center, extra live article, unreviewed draft, or parent/known API-slug drift stops the entire preflight. Dry-run output distinguishes updates from unchanged content; it does not silently skip a missing category.

The renderer supports JSON-string frontmatter, paragraphs, level-two/three headings, sequential numbered lists, bullets, bold text, inline code, absolute HTTPS/mailto links, and standalone Markdown images declared in `help-center-visuals.json`. Unsupported syntax fails rather than becoming literal Markdown or losing links. Inline images, undeclared assets, local paths in published HTML, missing or changed alt text, data URLs, unknown image hosts, and signed or expiring URLs fail validation. Historical heading fragment IDs remain as anchors when a section changes.

## Browser preparation and dry run

When an API key is unavailable, first inspect the authenticated Featurebase article dashboard. Record every visible published article and draft. Match the 19 canonical article IDs, and leave the three reviewed unrelated drafts in `browser-publication-2026-09-04.json` untouched. Stop if another article, draft, collection, parent, or title is present without a reviewed disposition.

Create the ignored browser import package after the public baseline and repository checks pass:

```sh
pnpm featurebase:export:help-center --public .featurebase/browser-before
pnpm featurebase:validate:help-visuals --publication
pnpm featurebase:prepare:help-center:browser
```

The package at `.featurebase/browser-import/index.json` contains the 19 existing IDs, edit URLs, titles, descriptions, rendered HTML, content fingerprint, links, labels, and each visual's local source path, exact placement, alt text, caption, and recorded attachment identity. It never creates an article or changes a parent, slug, collection, or order.

For each article with visuals, use the authenticated editor and the declared local source file. Do not paste a stable attachment URL into the editor; Featurebase can discard remote image tags. Upload the file as a native image block, place it before the declared heading or at the lead, and enter the declared alt text. Reopen the saved draft before recording it. Check the title, description, heading order, list structure, links, emphasized labels, image count, attachment identity, alt text, caption, and placement. A saved draft is not published evidence.

Write the sanitized browser receipt to `.featurebase/browser-import/browser-receipt.json`, then run:

```sh
pnpm featurebase:verify:help-center:browser
```

The receipt validator rejects a stale content hash, missing or extra article, unexpected image, changed attachment identity, lost alt text or caption, changed heading, link, label, title, or description. Keep raw editor HTML, signed URLs, and browser state out of Git.

## Visual assets

The versioned visual manifest is `docs/featurebase/help-center-visuals.json`. It is the source of truth for each asset key, repository source, article placement, alt text, caption, dimensions, checksum, provenance, screenshot route and commit, and Featurebase attachment identity. Canonical articles may use standalone Markdown image syntax with a repository-relative path. The renderer resolves that path through the manifest and never publishes it directly.

Build and validate the committed sources with:

```sh
pnpm featurebase:build:help-visuals
pnpm featurebase:validate:help-visuals
```

Headers are 1600×640 WebP files. Diagrams retain editable SVG sources plus 1400×800 PNG renderings. Screenshots are cropped PNGs and must contain fictional or redacted data. Generated UI cannot be used as evidence of product behavior. Screenshot captions must disclose illustrative fixtures, and screenshot manifest entries must record the route and verified commit used to check their labels.

Before uploading the complete set, upload one canary image in the authenticated Featurebase editor. Reopen the saved draft, inspect the stored attachment URL and HTML, record the stable attachment identity and public URL in the manifest, then confirm the browser package and renderer preserve the image, alt text, caption, and position. Do not publish the canary. Browser canary evidence may replace API draft inspection only in the browser workflow.

Upload the remaining assets only after the canary round trip passes. Use stable Featurebase-hosted attachment URLs without signature query parameters. Record each returned identity in the manifest and change its state to `uploaded` only after the saved draft has been re-read. Run `pnpm featurebase:validate:help-visuals --publication` before the Help Center publication gate. The importer requires every referenced visual to be uploaded, which prevents a future content sync from replacing browser-hosted images with local paths or silently dropping them.

Reorder currently verifies the existing public order and makes zero writes. The documented update API does not expose an order field. Any order difference fails with an explanation; it is never reported as a successful reorder. Collection names and ordering remain unchanged in WRE-92.

## API publication gate

After the complete audit, review, link and visual checks, with no unresolved P1/P2 documentation issue, run:

```sh
pnpm featurebase:validate:help-center --publication
pnpm featurebase:import:help-center --publish
```

The publication validator reruns the required commands and writes a short-lived validation receipt only when they pass. The importer requires that receipt, a clean API dry run from the last hour, the same content hash, and an unchanged API baseline. A public snapshot alone cannot authorize a write.

The importer uses `PATCH` on the existing IDs and sends only title, description, HTML body, `formatter: raw`, and live state. Author, icon, parent, slug, and order are not intentionally changed. Before each update it rechecks for concurrent edits. It verifies each saved article, re-exports the API and public pages, and compares content structure, links, fragment IDs, titles, descriptions, slugs, collection placement, and order.

Featurebase updates are not an atomic batch. A later failure can leave earlier articles updated. The tool records `written-unverified`, `api-verified`, or `stopped-review-required` in `.featurebase/import-results.json` and never labels a partial run complete. Stop and review the export before retrying; do not blindly roll back someone else's edits. A stale public cache also blocks final verification rather than being treated as success.

## Browser publication gate

After `pnpm featurebase:verify:help-center:browser` passes for the saved drafts, set `completeBrowserDraftAudit` only from that authenticated evidence and run:

```sh
pnpm featurebase:validate:help-center:browser
```

This browser-specific publication gate replaces the unavailable API dry run with the exact saved-draft receipt. It still reruns ordering, feature, gap, copy, Featurebase, policy, repository-hygiene, and release-integrity checks. It does not publish an article or make the API-only workflow appear complete.

Publishing is a separate action in Featurebase and requires action-time approval. After approval, use **Publish changes** only on the 16 article IDs in the verified receipt. Do not publish the three unrelated drafts or any article that changed after the receipt.

Reopen every published article, then run a fresh public export. Record a second receipt with `phase: published` and verify it with the same command. The published receipt must cover all 19 canonical articles and confirm 20 assets, 23 placements, zero missing articles, and zero unexpected articles. A browser upload, autosave indicator, or visible draft is not live publication evidence.

## Evidence and closeout

Keep the article-level inventory and validation summary in the PR. Report repository preparation separately from live publication. A successful local renderer, build, public GET, or dry run is not live sync evidence. After publication, confirm the old full URLs and fragments still resolve, inspect formatting in Featurebase, and record the fresh re-export comparison. Keep the Linear issue out of Done while any required evidence is missing.

The historical final-source files are reference stubs, not HTTP redirects. The old content remains in Git at the recorded base commit. No external redirect or Moxie/Mintlify synchronization is implied.

API references: [article retrieval](https://developers.featurebase.app/api/resources/help_center/subresources/articles/methods/retrieve), [article update](https://developers.featurebase.app/api/resources/help_center/subresources/articles/methods/update), and [collection update](https://developers.featurebase.app/api/resources/help_center/subresources/collections/methods/update).
