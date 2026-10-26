# WRE-218 motion audit

## Shared motion rules

- Durations are 100 ms (instant), 140 ms (fast), 200 ms (standard), and 280 ms (deliberate), with matching standard, enter, and exit easing curves across CSS, Expo, and SwiftUI.
- Motion is limited to opacity, transform, color, and shadow. Loading placeholders reserve content space; skeletons do not animate layout dimensions.
- Reduced-motion preferences disable decorative web animation and reduce or remove native transitions and press transforms. Focus styles and native touch/accessibility semantics remain in place.

## Surface coverage

| Surface | Shared treatment | Coverage and intentional exceptions |
| --- | --- | --- |
| Next.js operator app | Shared button press state, dialogs/sheets, route enter/exit presence, stable skeleton shimmer | Shared UI primitives cover existing screens. Action-specific loading indicators remain unchanged. |
| Next.js marketing | Shared button depth, route enter/exit presence, one Anime.js hero sequence | Hero content is sequenced once on initial entry. Other page content stays static. |
| Expo mobile | Reanimated touch feedback for existing `TouchableOpacity` controls, stack/tab transitions, stable skeleton patterns | Applied throughout existing route files. Action submission, auth bootstrap, detail-query, and documentation WebView waits retain spinners. |
| Native iOS | Shared button styles, root/tab/content transitions, fixed-shape loading placeholders | Dashboard, inventory, customers, credit, reports, and POS get domain-shaped placeholders. Delivery audit and authenticated-web waits retain progress indicators; native navigation and sheets keep system transitions. |

## Verification record

Implementation checks are recorded on Linear issue [WRE-218](https://linear.app/wrelik/issue/WRE-218/polish-motion-and-tactile-feedback-across-drx-surfaces).

- Web app and marketing production builds, readiness/type checks, and marketing lint completed successfully. Marketing rendered 37 routes; the operator app rendered 119 routes.
- Expo mobile typecheck and lint completed with warnings but no errors; Android bundle export succeeded (2,764 modules, 8.9 MB bundle).
- iOS simulator build, install, and launch succeeded on iPhone 18 Pro Max. The entry screen and sign-in sheet opened and closed; the UI snapshot exposed accessible button labels.
- `pnpm release:integrity`, `pnpm test:docs:mintlify`, and `git diff --check` passed.
- Marketing was visually reviewed at desktop size and keyboard focus reached the skip-to-main link. VoiceOver, Dynamic Type, reduced-motion interaction, and a full operator authenticated workflow remain unverified and need human/device review.
