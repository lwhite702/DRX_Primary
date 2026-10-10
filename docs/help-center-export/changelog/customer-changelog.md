# DRX customer changelog

This page highlights changes that affect day-to-day work in DRX. Release notes use the verified release records in the repository. Work still marked **Unreleased** stays out of this page.

DRX is in early access, so a feature may be available on web, mobile web, or a native app at different times.

## 2026-10-10 — v0.12.0

### New

- **Toggle between days in reports:** Easily navigate back and forth between previous days on web, iOS, and mobile to view past sales, subtotal, and tax summaries.
- **Reporting timezone:** Configure your store's reporting timezone in settings (defaulting to Eastern Time) so daily cutoffs and summaries match your local operating hours.
- **Safe human-readable order numbers:** Orders now display clean, memorable order numbers (e.g. `ORD-489201`) across receipts, point-of-sale screens, and customer details.

### Improved

- **Apple-grade desktop transitions:** Fluid, instant customer inline lookups with zero layout jump, polished loading states, and smooth interface entrances across all desktop screens.
- **Desktop checkout parity:** Complete cash tendering, exact change calculations, and store credit validation on desktop web matching mobile and iOS.
- **Fluid form typing:** Backspacing and rapid digit entry now work smoothly across all quantity, price, and fee inputs.

## 2026-09-17 — v0.9.4

### Improved

- **Smooth business setup on mobile:** Starting a new business account from an iPhone or iPad moves directly into your workspace without getting stuck during setup.
- **Clearer order totals:** Point-of-sale discounts and adjustments calculate instantly so the final charge matches your receipt before you accept payment.

## 2026-09-17 — v0.9.3

### New

- **Quick cart adjustments:** Remove an individual item from the register cart with a single tap, or clear the entire cart with a quick confirmation.
- **Add-to-cart confirmation:** Adding a product shows an immediate, gentle confirmation banner so cashiers know an item was scanned or tapped without second-guessing.
- **Cart badges on product cards:** Product tiles now display how many units are already sitting in the register cart.
- **Dedicated text message consent:** Customers and staff can opt in to important store alerts and support text messages with clear privacy choices.

### Improved

- **Faster, more reliable sign-in:** The sign-in screen loads more quickly, with stronger field visibility and high-contrast styling so you can get right to work.
- **In-app help and feedback:** Send feedback or report an issue directly from within DRX whenever you need assistance.
- **Smoother setup wizard:** Setting up a new shop guides you step by step and alerts you clearly if any required detail was skipped.

## 2026-08-30 — v0.6.12

### New

- **DRX Help Center:** Guides for deliveries, fractional and bulk pricing, mobile use, and store runbooks now live in one documentation hub.

### Improved

- **More consistent checkout and reports:** Completed sales and reporting use one source of transaction data. This reduces duplicate or missing totals when a sale moves through checkout.
- **Mobile and PWA navigation:** Touch targets and update handling are more dependable on smaller screens.
- **Support routing:** Help and email support paths are clearer across the web, mobile, and iOS surfaces.

## 2026-08-24 — v0.6.8

### Improved

- **Quick Sale keeps its place:** Your cart and register state stay in place when you move between the sale and payment screens.
- **Checkout totals are easier to trust:** Tax, delivery, fee, and discount details continue to render when an optional value is not present.
- **Smoother navigation:** Quick Sale and other navigation items no longer flash into view while access checks finish.
- **Payments screens are easier to read:** Dark-theme cards and labels have clearer contrast.

### Fixed

- Quick Sale now has a clear access-denied state instead of sending an authorized operator into a loading loop.

## 2026-08-23 — v0.6.6

### Improved

- **Sign-in fields are easier to see:** Email and password fields have clearer boundaries and a brighter cursor across web, mobile, and iOS sign-in screens.

## 2026-08-23 — v0.6.1

### Improved

- **Offline recovery:** DRX can recover more safely when a browser loses its local database connection during offline work.
- **Cleaner error reporting:** Browser-extension disconnect noise is filtered so real issues are easier to spot.

## 2026-08-23 — v0.6.0

### New

- **Fractional and value-based selling:** Stores can sell by quantity or spend, use suggested dollar presets, set bulk-price tiers, and configure loyalty benefits.
- **Delivery fulfillment:** Delivery orders can carry an encrypted address, vendor costs, tax details, assignment, status updates, reminders, and a manager escalation path.
- **Quick Sale recovery:** Completed sales use a retry-safe checkout path, and operators can exit when no manager PIN is configured.
- **Help when feedback is unavailable:** In-app bug-report links open the DRX Help Center when the feedback form cannot load.

### Improved

- Dashboard, Payments, customer, Inventory, and reporting screens handle incomplete or delayed data more clearly.
- DRX keeps customer details and delivery information minimized in error and analytics paths.

## 2026-07-22 — v0.5.7

### Fixed

- **Onboarding finishes cleanly:** After you complete onboarding, DRX takes you to the dashboard instead of leaving you on the setup screen.

## 2026-05-31 — v0.5.5

### New

- **Privacy-first customer profiles:** Stores can use short-lived customer details and a cleanup queue that removes qualifying records according to the selected privacy setting.
- **Safer Inventory updates:** Stock changes use a transaction and audit trail designed to keep counts and intake batches together.

## 2026-03-11 — v0.5.4

### Improved

- **More reliable sign-in and Help Center access:** The app's authentication and help routes were corrected so production builds can load the right screen.

## 2026-02-14 — v0.5.1

### New

- **Branded waitlist:** People joining early access now stay on the DRX app's branded waitlist page.
- **Onboarding access checks:** Signed-in operators are guided through setup before they enter the main app.

## 2026-02-14 — v0.5.0

### New

- **Quick Sale:** A focused counter flow for adding products, taking payment, and completing a sale.
- **Quick Sale controls:** Product search, customer lookup or quick creation, checkout, and manager exit checks are available in the POS flow.

If you need technical release detail or help with a specific workflow, [contact support](mailto:support@deelrxcrm.com).
