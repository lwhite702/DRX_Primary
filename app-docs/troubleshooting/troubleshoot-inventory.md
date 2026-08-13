---
title: "Troubleshoot inventory"
description: "Fix common DRX inventory issues: product creation errors, barcode/SKU conflicts, intake count or cost discrepancies, adjustment mistakes, and audit trail mismatches."
tags:
  - inventory
  - barcode
  - SKU
  - audit
---
## Overview

This guide helps you resolve common inventory problems in DRX: creating products, clearing barcode or SKU conflicts, fixing intake discrepancies, correcting adjustments, and investigating audit trail mismatches. Use the steps below to get your counts, costs, and history accurate again.

## Before you start

- You can sign in to your DRX workspace.
- You have permission to view and edit Inventory.
- You know the product name, SKU, or barcode you’re troubleshooting.
- You have recent intake documents (vendor, batch, or purchase order) if you’re checking received stock.

## You can’t create a product because the SKU or barcode is already in use

This happens when a new item shares an identifier with an existing product. DRX requires unique SKUs and barcodes to keep counts and sales history accurate.

1. **Open** Inventory.
2. **Search** for the SKU or barcode to find the existing product.
   - Use the search bar and enter the exact SKU or scan the barcode.
3. **Decide** whether to reuse or change the identifier.
   - To keep one product: **Edit** the existing product and update its details (name, vendor, options) instead of creating a duplicate.
   - To add a different product: **Edit** your new item’s SKU or barcode so it’s unique before saving.
4. **Save** your changes and **confirm** the product now appears once in search.

## Product appears twice after intake

You may see duplicates if one item was created with a SKU and another with only a barcode (or vice versa), and intake was applied to both.

1. **Search** Inventory for the product name, SKU, and barcode.
2. **Pick** the correct product to keep (the one with accurate sales and history).
3. **Move** remaining stock from the duplicate into the correct product using an adjustment.
   - Open the duplicate product and **Create** an adjustment to reduce its on-hand count to zero with reason "Correction".
   - Open the correct product and **Create** an adjustment to increase by the same quantity with reason "Correction".
4. **Mark** the duplicate as not for sale by clearing its identifiers (remove the conflicting SKU or barcode) or archiving it if your workflow requires it.
5. **Verify** only one product shows in search and counts match.

## Intake quantity or cost doesn’t match what you received

If the stock on hand or average cost looks wrong after receiving goods, review the intake record and correct it.

1. **Open** Inventory and **Go to** Intake.
2. **Filter** by vendor, batch, or date to find the intake in question.
3. **Open** the intake record and **Compare** item quantities, unit cost, and any fees to your source document.
4. **Correct** mistakes:
   - If you over- or under-received: **Create** a new intake for the missing items or **Create** an adjustment to fix quantity with reason "Receiving correction".
   - If unit cost is wrong: **Reverse** the error by adjusting cost via a correcting intake (negative/positive as your policy allows) so the resulting average cost matches your invoice.
5. **Refresh** Inventory and **Confirm** on-hand quantity and average cost now reflect the correction.

## Adjustment made the count wrong

Counts can drift if an adjustment was entered with the wrong sign, quantity, or reason.

1. **Open** Inventory and **Go to** Adjust.
2. **Filter** by product and date to see recent adjustments.
3. **Open** the incorrect adjustment and **Review** the before/after counts and reason.
4. **Create** a correcting adjustment:
   - Use the opposite sign or the correct quantity.
   - Set reason to "Correction" and add a short note.
5. **Check** the product’s current on-hand and low‑stock status to ensure it’s accurate.

## Barcode scans to the wrong product at checkout

A reused or misassigned barcode can route sales to the wrong item, affecting counts and revenue.

1. **Search** Inventory for the barcode to identify all products that contain it.
2. **Choose** the correct product and **Keep** the barcode on it.
3. **Remove** the barcode from any other product:
   - **Edit** the duplicate product and clear the barcode field, then **Save**.
4. **Scan‑test** the barcode in a test cart to ensure it pulls up the intended product.
5. **Review** recent sales in the audit trail for this barcode and **Create** adjustments if counts were affected.

## Audit trail shows movements you don’t expect

If the history doesn’t match your expectations, filter the audit trail to see which actions changed the count or cost and by whom.

1. **Open** Inventory and **Go to** Audit.
2. **Filter** by product, date range, and movement type (intake, sale, adjustment) to narrow the list.
3. **Open** each entry to **Review** details such as quantity change, cost, and notes.
4. **Identify** the source of the variance (incorrect intake, sale, or adjustment).
5. **Create** a correcting adjustment or intake as needed, and **Add** a clear note so future audits explain the change.

## Low‑stock alert doesn’t match on‑hand

Alerts may seem off if counts include pending corrections or if a duplicate product splits the stock.

1. **Search** for duplicates of the item by name, SKU, and barcode and **Merge** stock using adjustments if needed.
2. **Open** the product and **Confirm** the on‑hand count in Inventory matches your physical count.
3. **Create** a correcting adjustment if they differ, then **Recheck** the alert after the update.

## Vendor or purchase order (beta) intake doesn’t appear in stock

If a received order doesn’t update on‑hand, the intake may be saved to a different product or missing identifiers.

1. **Open** Intake and **Filter** by vendor, batch, or purchase order (beta) to locate the record.
2. **Open** the intake and **Verify** each line’s SKU/barcode matches the intended product.
3. **Correct** mismatched lines by creating a new intake for the right product and **Create** adjustments to move any accidental stock.
4. **Confirm** the product’s on‑hand and average cost reflect the received quantities.

## Still need help

- Recheck you searched by exact SKU or barcode and reviewed recent intake, adjustments, and audit entries for the same date range.
- If you don’t have access to Inventory or can’t find expected records, contact your workspace admin to confirm your role and permissions.
- If the issue persists after these steps, share product names, SKUs, barcodes, and relevant dates with your workspace admin for further review.
