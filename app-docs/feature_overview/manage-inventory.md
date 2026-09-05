---
title: "Manage inventory"
description: "Create products, receive stock with costs and vendors, make reasoned adjustments, and confirm changes in the audit trail and low‑stock alerts in DRX."
tags:
  - inventory
  - point of sale
  - retail
---
## Overview

Use Inventory in DRX to create products, intake stock with costs and vendors, make reasoned count adjustments, and verify every change in the audit trail. It’s built for shop owners and staff who need accurate on‑hand counts, clear low‑stock alerts, and a complete movement history without extra setup.

This page walks you from creating a product, to receiving stock into that product, to adjusting counts if needed, and finally confirming results in the audit trail and low‑stock views.

## When to use it

- Add new items you plan to sell, including SKUs or barcodes.
- Receive shipments and record cost, vendor, and batch details.
- Correct counts after cycle counts, damages, or returns with a clear reason.
- Review what changed, when, and by whom in the audit trail.
- Keep an eye on low‑stock items before you run out.

## How to use it

1. **Open Inventory.** Go to “/inventory” to see your products and on‑hand counts.
2. **Create a product.** Select the option to add a new product. Enter the product name and any identifiers you use, such as “SKU” or “Barcode.” Add a selling price now or later. Save the product.
3. **Receive stock with costs and vendor.** Go to “/inventory/intake.” Search for or select the product you just created. Enter the “Quantity” you’re receiving. Add “Cost” per unit, select or enter the “Vendor,” and include optional details like “Batch” or a reference to a purchase order (if you track them). Confirm to intake the stock so on‑hand updates immediately.
4. **Make a reasoned adjustment (if counts are off).** Go to “/inventory/adjust.” Select the product, then enter the new quantity or the amount to adjust. Choose a clear “Reason” (for example: count correction, damage, or shrink). Add a short note if helpful, then apply the adjustment. Your on‑hand reflects the change right away.
5. **Verify changes in the audit trail.** Open “/inventory/audit.” Filter or search for the product to see each movement, including the intake and any adjustments. Review timestamps, quantities, reasons, and the user who made the change to confirm accuracy.
6. **Check low‑stock alerts.** From Inventory, review items flagged as low on stock. If an item appears here after your updates, repeat intake or plan a purchase order (beta) so you don’t run out.

### Optional: Receive multiple products at once

1. **Start an intake session** at “/inventory/intake.”
2. **Add products one by one,** entering quantity, cost, vendor, and batch for each line.
3. **Confirm the intake** to update on‑hand counts for all included products.

## Options and settings

- Product identifiers: Add “SKU” and “Barcode” when creating or editing a product to speed up scans and lookups.
- Vendors: Record the vendor on each intake line so you can trace cost history and sourcing.
- Batches: Use “Batch” on intake to group units from the same delivery for easier tracking.
- Reasons on adjustments: Always choose a reason so the audit trail clearly explains why counts changed.
- Purchase orders (beta): You can associate intake with a purchase order if you track incoming stock that way.

## Tips

- Enter accurate “Cost” during intake to keep margins and reporting meaningful.
- Use clear, consistent adjustment reasons so future reviews in “/inventory/audit” are unambiguous.
- Scan barcodes during intake and adjustments to avoid selecting the wrong product.
- If a low‑stock alert persists after intake, confirm the correct product was received and review the audit trail for recent reductions.
