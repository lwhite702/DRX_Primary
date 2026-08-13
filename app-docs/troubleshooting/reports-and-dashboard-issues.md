---
title: "Reports and dashboard issues"
description: "Fix checkout problems, inventory mismatches, report delays, and scanner/printing issues in DRX. Follow step-by-step checks for discounts, payments, customers, receipts, stock counts, exports, filters, and device connectivity."
tags:
  - reports
  - checkout
  - inventory
  - hardware
---
## Overview

This guide helps you fix problems in DRX when checking out customers, keeping inventory accurate, viewing reports, and using barcode scanners or printers. Use the sections below to resolve issues with ringing up sales, discounts, payments, customers, receipts, stock counts, data exports, filters, and device connectivity.

## Before you start

- You need a DRX login with the right role: Operator for checkout, Manager or Admin for inventory and reports.
- Make sure you can access the dashboard on desktop for reports and inventory, and the mobile-friendly checkout for in‑store sales.
- Confirm your internet connection if you use cloud login from multiple locations.

## Items won’t scan or add to the sale

You may see no item appear after scanning, or the wrong product shows up. This usually relates to barcode pairing, barcode/SKU conflicts, or a misread.

1. **Try** product search by name or SKU in checkout to confirm the item exists and is active.
2. **Scan** a second unit of the same product to rule out a damaged barcode.
3. **Check** for duplicate barcodes/SKUs in your catalog. If two products share the same code, update one code so each product is unique.
   - If you can’t edit now, **use** product search to complete the sale, then fix codes after checkout.
4. **Re-pair** your scanner to the device if scans are not reaching the input field.
   - For Bluetooth scanners, ensure it’s connected to your device and not another register.
   - For mobile camera scanning, clean the lens and ensure good lighting.
5. **Confirm** the quantity increases when scanning. If it replaces the line instead, **adjust** quantity using the quantity control in checkout.

## Can’t apply a discount at checkout

A discount may fail to apply or the total does not change as expected.

1. **Select** the line item or the whole cart before applying the discount so DRX knows the target.
2. **Apply** the discount again and **review** the updated totals and tax lines.
3. **Check** your role permissions. Operators can discount if allowed; Managers/Admins can always override within policy.
4. **Remove** and re-add the item if a previous adjustment is stuck, then **apply** the discount again.

## Payment won’t complete or the amount looks wrong

You may see a declined payment, an incomplete handoff, or totals not matching after a discount.

1. **Verify** the cart total matches what you expect after discounts and taxes.
2. **Choose** the correct payment type supported in DRX and **confirm** the amount before submitting.
3. **Retry** the payment once if it times out. Do not create a duplicate cart unless the first attempt clearly failed.
4. **Check** your network connection. If you moved between Wi‑Fi and cellular, **refresh** the checkout view and try again.
5. **Review** the transaction history to confirm whether the sale captured before attempting again.

## Can’t attach a customer to the sale

Customer lookup may not return the expected profile, or adding a customer might fail.

1. **Search** by alias, name, or known identifier. DRX supports alias‑first tracking, so many fields can be blank.
2. **Create** a lightweight profile if the customer is new. Only add optional notes or tags if needed.
3. **Re-try** attaching the customer after adding them. **Confirm** the profile appears at the top of the cart.
4. **Remove** and **re-add** the customer if the wrong profile was attached.

## Receipt won’t print or share

After payment, you may not see a printed receipt or the device cannot reach the printer.

1. **Confirm** the sale is completed in transaction history before printing.
2. **Check** the printer connection (cable or Bluetooth) and that it is powered and has paper.
3. **Re-try** printing from the completed sale record. If printing is unavailable, **use** the on‑screen receipt to share or save.
4. **Test** a different device if the printer pairs with only one device at a time.

## Live stock counts look wrong after sales

You may notice mismatched counts, negative stock, or low‑stock alerts not firing.

1. **Open** the item details and **review** the current stock, recent sales, and any adjustments.
2. **Check** for barcode/SKU conflicts that route sales to the wrong product.
3. **Confirm** that quantities were adjusted correctly during checkout (returns, exchanges, or manual edits can affect counts).
4. **Perform** an inventory adjustment with a clear note if you verify a physical count differs from DRX.
5. **Review** low‑stock thresholds. If alerts are expected but not seen, **lower** the threshold or **recount** to ensure the current stock is accurate.

## Batch or vendor link looks incorrect

You may see products tied to the wrong batch or vendor, or purchase order details that don’t match stock.

1. **Review** the product’s batch and vendor fields for the current stock entries.
2. **Correct** any mismatched linkage so future receipts and costs align with the right vendor or batch.
3. **Document** an inventory adjustment with a note explaining the correction for accountability.

## Adjustment log shows gaps

If stock changes don’t appear in the adjustment log, it’s often due to a filter, role limit, or the change happening in a different location.

1. **Clear** any date or user filters in the adjustment log.
2. **Switch** the location filter to the site where the change occurred.
3. **Check** your role. Only certain roles can view all adjustments; ask a Manager or Admin to confirm entries if you cannot see them.

## Sales data is missing or delayed in reports

Recent sales may not appear on the dashboard right away, or totals look lower than expected.

1. **Refresh** the dashboard on desktop and **wait** a moment for live totals to update.
2. **Check** the selected time range. A narrow or past range can hide today’s sales.
3. **Confirm** the location filter matches where the sales were processed.
4. **Verify** that the sale is completed in transaction history and not pending or voided.

## Report exports fail or download the wrong slice

You might see an export that won’t start or the file doesn’t match the time range or location you expected.

1. **Set** the time range and location filters on the reports view before exporting.
2. **Retry** the export after ensuring a stable internet connection.
3. **Reduce** the date span if the dataset is very large, then **export** again.

## Time range and location filters don’t match what I see

Totals can look off if filters are set differently across views.

1. **Align** the time range on the dashboard and detailed reports to the same dates.
2. **Match** the location filter across all views. Separate store views keep data cleanly separated.
3. **Recalculate** by **refreshing** the page after changing filters.

## Barcode scanner will not pair or misreads

Hardware pairing issues or misreads can stop checkout from flowing smoothly.

1. **Charge** the scanner and **power cycle** it before pairing.
2. **Connect** the scanner to the current device and **disconnect** it from any other register.
3. **Test** in a simple text field to confirm scans produce characters, then **return** to checkout.
4. **Clean** the barcode and scanner window; avoid glare and low light.
5. **Switch** to product search temporarily if scanning remains unreliable, then address duplicates or damaged codes later.

## Mobile camera scanning is slow or fails

Camera-based scanning can struggle in poor light or with small codes.

1. **Improve** lighting and **steady** the device about 6–10 inches from the code.
2. **Angle** slightly to avoid reflections on glossy packaging.
3. **Use** product search if a code won’t read, then **update** the barcode later if it’s printed too small or damaged.

## Printer will not stay connected

Receipts may stop printing if the printer loses power or the device pairs to something else.

1. **Plug** the printer into stable power and **check** paper and cover seating.
2. **Re-pair** or **reconnect** the printer to the current device only.
3. **Test** a sample print from a completed sale to confirm connectivity.

## Still need help

- Recheck your role and location filters; many visibility issues are caused by mismatched permissions or store views.
- If problems persist, contact your workspace Admin or Manager. Share the sale time, product SKU/barcode, location, and what you expected to see so they can review activity tracking and adjustments.
