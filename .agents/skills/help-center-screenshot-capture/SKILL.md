---
name: help-center-screenshot-capture
description: Capture and review DRX Help Center product screenshots with fictional data and current UI labels. Use for any documentation screenshot, crop, annotation, or screenshot refresh.
---

# DRX Help Center screenshot capture

Treat a screenshot as product instruction. It must match the documented surface closely enough that a reader can find the same page and control.

## Source order

1. Capture the current beta route with a dedicated fictional tenant.
2. If that is unavailable, use an existing repository visual fixture only after comparing its visible labels and state with current source.
3. Create a documentation fixture from current components only when the first two options are unavailable.
4. Hold the screenshot when the surface, release state, or wording cannot be verified.

Read [references/capture-checklist.md](references/capture-checklist.md) before capture.

## Capture

- Use Chromium at 1440x1024 unless the article is specifically mobile.
- Disable animation and wait for fonts and images.
- Use fictional names, products, balances, dates, staff, and business data.
- Remove development portals, browser chrome, notifications, and unrelated navigation.
- Crop to the smallest region that includes the page identity and the action being explained.
- Do not blur real data. Replace it with fictional data before capture.
- Do not add numbered markers unless the article uses the same numbers immediately below the image.

## Verify

Compare every visible page, button, field, tab, menu item, and status with the current route, component, feature canon, and release state. A fixture may be used only when it passes that comparison. If it remains illustrative rather than an exact live capture, add the caption `Illustrative screen with fictional data.`

## Export and record

- Export a tightly cropped PNG under 700 KB.
- Keep text crisp at the Mintlify article width (around 760 px).
- Add useful alt text that identifies the screen and the highlighted action; do not repeat the caption.
- Record provenance, route, source commit, dimensions, checksum, and article placement in `docs/featurebase/help-center-visuals.json`.
- Never include credentials, verification codes, customer records, addresses, real balances, payment details, or raw production payloads.

## Publication check

After publishing or compiling, inspect the pages at desktop and mobile widths. Confirm the image loads, alt text remains present, the caption is adjacent, and no signed attachment query is committed to Git.
