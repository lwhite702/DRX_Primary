# DRX Mintlify design system

The Help Center should feel like the same DRX operators use in the product: dark, focused, calm, and direct. The documentation remains easy to read in light mode and does not imitate product controls.

## Brand contract

- Product name: **DRX** in navigation; **Deelrx CRM** when the formal name is needed.
- Brand accent: `#CCFF00` for controlled surfaces such as the primary button, diagrams, and artwork.
- Accessible documentation link color: `#526600` on light surfaces and `#D8FF4D` on dark surfaces.
- Dark background: `#0A0A0A`; raised dark surface: `#141414`.
- Light background: `#F7F7F4`; light surface: `#FFFFFF`.
- Main typeface: Plus Jakarta Sans, matching the marketing site.
- Body text stays sentence case. Buttons and small navigation labels may use restrained uppercase styling.
- Lime marks the next action, active navigation, and focus. It is not used for long text or large background areas.
- Images use a quiet border, modest corner radius, and no glow.

## Content layout

- Keep the Mintlify sidebar and table of contents familiar.
- Put the one-sentence purpose directly below the article title.
- Place conceptual headers after frontmatter and before prerequisites.
- Place screenshots immediately before the action they clarify.
- Place diagrams immediately before the decision or consequence they explain.
- Use captions for fictional fixtures and platform-specific states.
- Keep procedures numbered and paragraphs short.

## Accessibility

- Support dark and light themes. Default to dark without removing the theme toggle.
- Keep the lime accent on dark or black text on lime for controls.
- Every image needs useful alt text. Decorative images should be omitted instead of given empty filler text.
- Check keyboard focus, link underlines, mobile navigation, image scaling, and 200% browser zoom.
- Validate at 390 px, 834 px, and 1440 px.

## Boundaries

- Do not generate product interface screenshots.
- Do not use pharmacy or medical imagery, regulated-retail products, generic security shields, stock photography, mascots, or celebratory money imagery.
- Do not imply availability, security, deletion, payment processing, or recovery behavior through decoration.
- Keep Featurebase branding out of Mintlify article content. Featurebase remains available through separate feedback, roadmap, and changelog links.
