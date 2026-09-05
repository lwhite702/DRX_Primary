---
title: "Troubleshoot Checkout and Payments"
description: "Fix cart, payment-method, customer-credit, and receipt-option issues in DRX Quick POS."
tags:
  - checkout
  - payments
  - POS
  - receipts
---
## Overview

This guide helps you fix common problems in DRX Quick POS. Quick POS supports one payment method per sale: Cash, Card, or Credit.

## Before you start

- You can open Quick POS and are signed in to the correct workspace.
- Your role can take payment and use customer credit.
- You know which receipt option (Print, SMS, None) your workspace supports.

## Items do not appear or totals look wrong in the cart

You may notice missing items, doubled lines, or taxes and discounts not reflecting after edits.

1. **Review** the cart line items.
   - Confirm each item, quantity, and price.
   - Check that discounts are visible in the cart and totals section.
2. **Remove** incorrect lines.
   - Delete any wrong item and add it back from scan or search.
3. **Refresh** the totals.
   - Confirm subtotal, tax, and total before moving to payment.

## The tender method you need is not available

Quick POS supports Cash, Card, and Credit. It does not show Zelle, split tenders, or other off-device methods.

1. **Reopen** the payment screen.
2. **Confirm** the cart total is greater than zero.
3. **Select** Cash, Card, or Credit only.
4. If you need a different method, use the approved workflow outside Quick POS.

## Split or reference-based payment will not complete

Quick POS does not accept split tenders, Zelle, or tender references.

1. Confirm that one full payment covers the total.
2. Use one method: Cash, Card, or Credit.
3. If the payment path requires references, use an approved workflow outside Quick POS.

## Credit cannot be posted for the customer

Credit uses the same flow as other payment methods and still requires a customer.

1. **Select** "Credit" as the payment method.
2. **Attach** the correct customer before completing.
3. **Confirm** the customer has enough credit and the credit confirmation checkbox is set.
4. If credit is unavailable, use an approved non-credit workflow.

## Receipt did not print or send

Quick POS supports Print, SMS, and None.

1. **Confirm** the sale is completed before retrying.
2. If SMS is selected, confirm the customer contact is available on the sale.
3. If Print is selected, confirm printer connection and paper.
4. If issues continue, use Sales to resend from the sale record.

## The sale looks wrong after completion

If there is a mismatch, verify the final items and payment in Sales.

1. **Open** the sale in Sales.
2. **Review** items, subtotal, tax, payment method, and receipt status.
3. **Do not** rerun the payment unless the sale did not complete.

## Still need help

- Recheck the customer is attached before using Credit.
- Confirm the selected method is a full-amount payment.
- Confirm printer and SMS contact details before retrying.
- If problems continue, contact your workspace admin with sale time, location, and what changed before the stop.
