# Gemini capture brief for DRX Help Center screenshots

Capture the current DRX product for the Mintlify Help Center. These images explain real tasks to store owners and staff. They are evidence of the product, not marketing mockups. Gemini may use the browser to capture and crop a screen; it must not generate or redraw a product interface, change a label, or invent a balance, workflow, or feature.

The current redesign uses a clear, dark DRX interface with the official DRX slash wordmark, white text, restrained lime accents, and quiet neutral surfaces. Keep the product itself exactly as it appears in the verified build. Do not recolor, rearrange, or retouch controls to make a capture look more branded. Do not add a second logo, headline, caption, glow, device frame, browser window, or screen inside another screen.

When an article needs a supporting visual rather than a literal step-by-step screenshot, use a close crop of one or more authentic UI areas. A few separated panels may sit together as a simple collage, but they must still come from the current app and retain their original labels and values. Do not turn the collage into a fake demo screen. Keep instructional diagrams separate from product captures and use their existing editable sources.

## Capture rules

- Capture the current, verified product build. Record its exact commit in the final manifest. A route or component in the repository alone does not prove that a screen is available to users.
- Use the dedicated fictional documentation business. Never use a real customer, worker, balance, address, product, transaction, credential, verification code, or regulated-retail record.
- Use the dedicated fictional documentation business and the neutral sample records already approved for it: `Northstar Demo Shop`, `Sam Reed`, `ALP-101`, and ordinary boxed goods. Never add a real-looking phone number, address, credential, verification code, or regulated-retail item.
- Capture desktop screens in Chromium at 1440×1024. Check responsive behavior at 390×844. If a documented task differs on mobile, capture and record that actual mobile state; do not squeeze the desktop screen into a phone frame.
- Wait for fonts, totals, and loading states. Disable animation.
- Remove browser chrome, development tools, notifications, and unrelated navigation.
- Crop to the page identity and the action being explained. Keep visible text readable at an article width of about 760 px. Prefer a clear close crop over a tiny full-page view.
- Export PNG in sRGB. Keep each file under 700 KB.
- Do not blur private data. Replace it with the approved fictional fixture before capture. If private data appears, do not use the image.
- Do not add arrows or numbered markers unless the article repeats the same numbers immediately below the image.
- Do not add visual effects, lime glows, decorative gradients, extra status badges, or alternate brand marks to a product capture. Use only colors, status indicators, totals, and controls already visible in the verified app.
- If the verified screen differs from this brief, stop and record the difference. Check both the current source and the running product. The running product is the capture source; current source helps confirm the behavior and exact labels.

## DRX visual direction

- Keep the DRX mark and wordmark exactly as shipped. Do not recreate the slash mark with text or substitute another logo.
- Preserve the product palette as rendered: near-black and charcoal surfaces, clear white text, and DRX lime (`#CCFF00`) for existing accents. Do not add color to controls that are not lime in the app.
- Keep screenshots crisp, calm, and easy to scan. Avoid dramatic lighting, glow, fake depth, perspective tilt, decorative framing, and visual clutter.
- If a genuine capture is placed beside another genuine capture, crop each to its task and leave enough separation to read them as distinct pieces of the app. Do not combine them into a simulated dashboard or device mockup.
- Do not use marketing-only vectors, fixture illustrations, or generated UI as proof that a workflow is available. The redesigned marketing hero and capability cards may use illustrative UI compositions; Help Center instructions must use verified product captures or clearly labeled current-source fixtures.

## Required product captures

| Key | Route and state | Capture | Article placement | Required visible labels | Alt text | File |
| --- | --- | --- | --- | --- | --- | --- |
| `onboarding-review` | `/onboarding`, owner at final review | Review screen immediately before workspace creation | Get started with DRX, before **Set up your business** | `Review your setup`, `Edit`, `Create My Workspace` | DRX onboarding review with fictional business details ready to create a workspace. | `mintlify/images/help-center/screenshots/onboarding-review.png` |
| `dashboard-overview` | `/dashboard`, fictional saved activity | Dashboard header, date context, and the primary totals visible without scrolling | Dashboard and reports, before **Check your dashboard** | Current dashboard title and period labels | DRX dashboard showing fictional activity and the period covered by each total. | `mintlify/images/help-center/screenshots/dashboard-overview.png` |
| `reports-period` | Current reports or insights route, nonempty fictional period | Period control, one summary, and one supporting table or chart | Dashboard and reports, before **Check your numbers**; reuse in Troubleshoot dashboard and reports | Current report title, period selector, export action when present | DRX report with a fictional date range, summary total, and supporting records. | `mintlify/images/help-center/screenshots/reports-period.png` |
| `support-entry` | Current authenticated Help surface | Help choices and private-support entry without an open message containing data | Help and support, before **Get help with a private issue** | Current Help and support labels | DRX Help screen showing documentation and private support choices. | `mintlify/images/help-center/screenshots/support-entry.png` |
| `privacy-settings` | `/settings`, Privacy Protocol section | All three presets and retention controls in one readable crop | Privacy and minimal data, before **Review and save the settings** | `Alias Mode`, `Standard Mode`, `Full Customer Mode`, cleanup controls | DRX privacy settings showing the three presets and retention cleanup controls. | `mintlify/images/help-center/screenshots/privacy-settings.png` |
| `workspace-selector` | `/workspaces`, two fictional businesses | Workspace selector with the active business clear | Switch workspaces and check access, before **Switch businesses** | Current workspace selection labels | DRX workspace selector with two fictional businesses and the active business identified. | `mintlify/images/help-center/screenshots/workspace-selector.png` |
| `manage-team` | `/settings/team`, fictional owner and staff member | Team list and the control used to manage access | Switch workspaces and check access, before **Check team access** | `Manage Team` or the exact current page label, role labels | DRX team settings with fictional members and their assigned roles. | `mintlify/images/help-center/screenshots/manage-team.png` |
| `customer-create` | `/customers`, add-customer form | Minimum permitted fields for the active privacy preset | Customers and store credit, before **Find or add a customer** | Exact current customer fields and save action | DRX customer form using a fictional alias and only the permitted optional details. | `mintlify/images/help-center/screenshots/customer-create.png` |
| `record-payment` | Current customer balance or credit route | Selected fictional customer, open balance, amount, method, and record action | Customers and store credit, before **Record a payment**; reuse in Troubleshoot customers and credit | `Record Payment` or the exact current action, amount and method fields | DRX payment record form for a fictional customer balance. | `mintlify/images/help-center/screenshots/record-payment.png` |
| `inventory-intake` | `/inventory/intake`, fictional product ready to receive | Product, quantity, unit, and submit or approval outcome | Inventory intake and adjustments, before **Record goods received** | Exact intake labels, current approval wording when shown | DRX Inventory intake with a fictional product, quantity, unit, and review action. | `mintlify/images/help-center/screenshots/inventory-intake.png` |
| `inventory-adjustment` | `/inventory/adjust` or current adjustment surface | Current count, corrected count, reason, and save action before submission | Troubleshoot inventory and audit, before the count-correction section | Exact count, reason, and save labels | DRX Inventory adjustment with fictional counts and a correction reason. | `mintlify/images/help-center/screenshots/inventory-adjustment.png` |
| `quick-sale-cart` | `/pos/sale`, fictional cart before payment | Search or scan field, cart lines, quantity, and verified total | Quick Sale checkout, before **Build the sale** | `Scan SKU / barcode or search products` or exact current label, payment continuation action | DRX Point of Sale with fictional products in a cart and a reviewable total. | `mintlify/images/help-center/screenshots/quick-sale-cart.png` |
| `quick-sale-payment` | `/pos/payment`, fictional sale before completion | Verified total, available payment methods, receipt choice, and completion action | Quick Sale checkout, before **Record payment and finish** | Exact payment methods, receipt choices, `Complete Sale` | DRX payment screen with fictional totals, payment method choices, and receipt options. | `mintlify/images/help-center/screenshots/quick-sale-payment.png` |
| `sale-details` | Current saved-sale detail route | Order reference, items, customer state, recorded payment method, and total | Sales history and receipts, before **Check the saved sale** | Current saved-sale and receipt labels | DRX saved sale details with fictional items, payment record, and total. | `mintlify/images/help-center/screenshots/sale-details.png` |
| `delivery-details` | `/deliveries` or current delivery detail surface | Delivery status, fictional recipient details, fee, and linked sale reference | Sales and deliveries (beta), before **Include delivery in a sale** | Current delivery status and action labels | DRX delivery details linked to a fictional saved sale. | `mintlify/images/help-center/screenshots/delivery-details.png` |
| `barcode-input` | `/pos/sale`, search field focused before scan | Focused scan/search field and the matched fictional product after one scan | Connect barcode scanners, before **Connect and check a scanner** | Exact scan/search field and matched product label | DRX product search matching a fictional barcode entered by a keyboard-style scanner. | `mintlify/images/help-center/screenshots/barcode-input.png` |

## Hold these captures

Do not capture **DRX Intelligence**, **Purchase orders (beta)**, or **Troubleshoot AI Intelligence** until the exact authenticated surface and its release state are verified. Clear text is safer than an illustrative product screen for these articles.

## Existing conceptual assets

The six article headers and six instructional diagrams already live in `app-docs/_assets/help-center/`. Do not recreate them with Gemini. Reuse them unless a design review finds a specific accessibility or product-accuracy problem.

## Help site visual QA captures

After Mintlify deploys the branch, capture these four review images separately from article assets:

1. Home page at 1440×1024 in dark mode.
2. Privacy and minimal data at 1440×1024 in light mode.
3. Quick Sale checkout at 390×844 in dark mode.
4. Open mobile navigation at 390×844.

The review must show the same DRX design language across the help home, articles, and navigation. Check readable lime accents, clear focus states, no clipped images, no horizontal scrolling, and enough contrast in both themes. Article headers and diagrams should sit naturally in the page; product screenshots must remain unaltered evidence and stay readable on mobile.

## Handoff record

For every accepted file, record the route, capture date, source commit, viewport, file dimensions, byte size, SHA-256 checksum, article placement, alt text, and whether the image is a live product capture or a current-source fixture. Replace the matching entry in `docs/featurebase/help-center-visuals.json` only after that verification.
