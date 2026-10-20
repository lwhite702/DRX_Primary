# DRX Customer Roadmap

This roadmap is directional. It shows what we’re actively shaping based on product direction in code and current operational priorities.

## Now

- **Create or attach customers during checkout** (`in progress`)
  Create an allowed minimal customer profile from the payment step without losing the current sale, or link an active customer to a completed anonymous sale from transaction review.
- **Accurate first-run setup progress** (`in progress`)
  Home reflects saved products and other completed setup steps for the active business, and offers a retry when progress cannot be refreshed.

- **Easier product setup across devices** (`in progress`)
  Choose automatic or your own SKU, set selling amounts without conflicting quick buttons, and calculate cost when you buy by the ounce but sell by the gram. Web rollout and native app verification are tracked separately.
- **Bundle prices for product quantities** (`in progress`)
  Set exact totals for larger amounts while adding a product, such as 2g for $60 or 3.5g for $90. Checkout and device verification are part of this work.
- **Exact dollar-amount checkout for fractional products** (`in progress`)
  Keep the requested merchandise amount exact while the operator reviews or edits the suggested fractional quantity. Flag price differences without blocking checkout, and use the confirmed quantity for stock and cost of goods. Cross-platform checkout and audit verification are in progress.
- **Fractional selling from product creation and onboarding** (`in progress`)
  Choose whole-unit or fractional sales while adding a product, including the guided first-product setup. Configure the selling unit, minimum, increment, precision, and suggested amounts before checkout. Cross-client persistence and device verification remain rollout gates.

- **0.6.0 mobile commerce and delivery fulfillment** (`planned`)
  Fractional quantity or dollar entry with serving suggestions, product-level presets, bulk pricing, spend-based loyalty tiers, delivery checkout and accounting, and an operator delivery queue with assignment, reminders, escalation, and reconciliation.

- **Release integrity and rollout readiness** (`in progress`)
  Evidence-aligned version, roadmap, changelog, and distribution records across web, iOS, and Android. Planned version metadata is not a store or production release.

- **Quick POS flow hardening** (`in progress`)  
  Faster operator flow, cleaner state transitions, and fewer checkout interruptions.

- **Inventory integrity controls** (`in progress`)  
  Better movement traceability and stronger audit confidence on high-volume items.

- **Help center quality upgrade** (`in progress`)  
  Route-accurate docs, clearer troubleshooting, and tighter in-app help coverage.

## Next

- **Customer online ordering, operator confirmation, and peer-to-peer payment rails** (`planned`)
  Privacy-first digital menu ordering accessible via branded operator links, custom subdomains, or short-code access gates. Customers build pickup or delivery orders with live inventory pricing and estimated totals without upfront charge. Operators review stock, confirm availability, place soft-reserved inventory holds, and issue binding totals to customer order tracking views. Customers confirm and settle via operator-configured peer rails (Cash App, Apple Pay, Zelle, or Cash) with custom instructions and payment verification before automated delivery queue dispatch or pickup release. Customers receive updates through both 10DLC SMS and live reactive web tracking.

- **Reporting + insights depth** (`planned`)  
  More actionable reporting views for managers and owners without extra clicks.

- **Automated delivery-provider ordering and tracking** (`planned`)
  Provider APIs for courier ordering, live status, and automated delivery updates after the manual 0.6.0 workflow is verified.

- **Loyalty points and redemption** (`planned`)
  Point accrual and redemption beyond the spend-based tier benefits planned for 0.6.0.

- **Credit / balance workflow polish** (`planned`)  
  Better visibility for overdue tracking and cleaner payment posting confidence.

- **Role and permission consistency** (`planned`)  
  Ongoing cleanup so role behavior is predictable across all routes.

## Later

- **Advanced delivery pricing and analytics** (`under review`)
  Partial subsidies, merchant markup, provider optimization, and deeper delivery profitability analysis.

- **AI-assisted operations expansion** (`under review`)  
  Smarter assistant signals for day-to-day decisions with stronger trust controls.

- **Advanced admin controls and observability** (`under review`)  
  Better high-impact control surfaces for large teams and multi-workspace operations.

- **Extended privacy automation** (`under review`)  
  Additional lifecycle tooling for sensitive-data handling and deletion workflows.
