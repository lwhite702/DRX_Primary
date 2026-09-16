# Gemini capture brief for DRX Help Center screenshots

Use this brief to capture current DRX product screens for the Mintlify Help Center. These are product screenshots, not generated interface concepts. Gemini may drive the browser and crop the result; it must not invent a DRX screen, label, balance, workflow, or feature.

## Capture rules

- Capture the current beta from the commit recorded in the final manifest.
- Use the dedicated fictional documentation business. Never use a real customer, worker, balance, address, product, transaction, credential, verification code, or regulated-retail record.
- Use neutral fictional data: `Northstar Demo Shop`, `Sam Reed`, `ALP-101`, and ordinary boxed goods.
- Desktop captures use Chromium at 1440×1024. Mobile validation uses 390×844.
- Wait for fonts, totals, and loading states. Disable animation.
- Remove browser chrome, development tools, notifications, and unrelated navigation.
- Crop to the page identity and action being explained. Keep visible text readable at an article width of about 760 px.
- Export PNG in sRGB. Keep each file under 700 KB.
- Do not blur private data. Replace it before capture.
- Do not add arrows or numbered markers unless the article repeats the same numbers immediately below the image.
- If the verified screen differs from this brief, stop and record the difference. The live UI and current source are authoritative.

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

The review must show readable lime accents, clear focus states, no clipped images, no horizontal scrolling, and enough contrast in both themes.

## Handoff record

For every accepted file, record the route, capture date, source commit, viewport, file dimensions, byte size, SHA-256 checksum, article placement, alt text, and whether the image is a live product capture or a current-source fixture. Replace the matching entry in `docs/featurebase/help-center-visuals.json` only after that verification.
