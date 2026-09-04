---
name: help-center-visuals
description: Create, place, and review DRX Help Center headers and instructional diagrams. Use when a Featurebase article needs a visual, when generating documentation art, or when changing the visual manifest or image renderer.
---

# DRX Help Center visuals

Create a visual only when it shortens an explanation, shows a relationship, or helps the reader recognize the next action. Do not add decoration to every article.

## Choose the asset type

1. Use a verified screenshot for an exact page, control, field, or navigation path.
2. Use a code-native diagram for a sequence, decision, retention window, or boundary.
3. Use a generated header for a collection-level concept that has no exact interface.
4. Leave the article text-only when the surface is unavailable, unverified, or likely to change.

Read [references/visual-contract.md](references/visual-contract.md) before creating an asset. For screenshots, also use the `help-center-screenshot-capture` skill.

## Generate headers

Use Prompt Perfect to refine the working prompt when its connector is available, then use the built-in image generator. Keep generated art conceptual. Never generate a product screen.

Use this prompt structure:

```text
Create a wide editorial header for the DRX Help Center.
Learning goal: {one concept the visual reinforces}.
Subject: {concrete objects or relationship}.
Composition: 2.5:1 landscape, quiet focal point, generous negative space, readable at article width.
Style: precise dark editorial illustration, restrained depth, crisp edges, subtle operational grid.
Palette: #0A0A0A, #121212, #1A1A1A, #F5F5F5, #A3A3A3, with #CCFF00 used sparingly.
Exclude: people, stock-photo styling, glossy 3D, fake UI, pharmacy or medical imagery, regulated-retail products, mascots, coins flying, generic shields and locks, gradients beyond a very subtle background falloff, and embedded prose.
Output: 1600x640, no transparent edge, no watermark.
```

Generate one distinct asset per call. Inspect the result at full size. Regenerate rather than patching a concept that is off-brand or misleading.

## Build diagrams

Create editable SVG with real text and simple shapes. Export a 1400x800 PNG for Featurebase. Use arrows only for actual direction. Use semantic colors only when they convey a documented state. Do not imply a guarantee with a lock, shield, checkmark, or permanence symbol.

## Place and record

- Store sources under `app-docs/_assets/help-center/`.
- Add every asset to `docs/featurebase/help-center-visuals.json` before referencing it.
- Use a standalone Markdown image block. Keep its relative path and alt text identical to the manifest.
- Put headers after frontmatter. Put screenshots immediately before the procedure they clarify. Put diagrams before the decision or consequence they summarize.
- Add a plain caption after fixture screenshots: `Illustrative screen with fictional data.`
- Never commit a signed Featurebase URL or a browser-local path.

## Review

Reject an asset when it contains private data, unsupported product behavior, illegible text, a wrong UI label, an unverified release claim, or a visual metaphor that softens a destructive consequence. Check the public article in light and dark themes and at 390px, 834px, and desktop widths.
