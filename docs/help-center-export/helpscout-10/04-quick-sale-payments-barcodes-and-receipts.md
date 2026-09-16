---
title: "Quick Sale, payments, barcodes, and receipts"
description: "Run checkout, choose payment, recover from common errors, and deliver a receipt."
---

## Before the line starts

- Confirm the workspace and signed-in operator.
- Test the scanner with a known product.
- Confirm products have prices and available stock.
- Confirm the workspace's allowed payment and receipt options.

## Run a Quick Sale

1. Open **Quick Sale**.
2. Scan a barcode or search by product name or SKU.
3. Check the product before adding it.
4. Adjust quantity or remove a line as needed.
5. Apply only approved discounts.
6. Attach a customer if needed. An alias is enough, and the sale can continue without a profile.
7. Review subtotal, discounts, tax, and total.
8. Continue to payment.
9. Choose one supported method for the sale.
10. Choose Print, SMS, or no receipt.
11. Complete the sale and wait for the confirmation screen.

Quick Sale supports one payment method for the full sale. Do not promise split tender or an unsupported processor.

## Cash, card, and credit

- **Cash:** confirm the amount due and follow the workspace's drawer process.
- **Card:** complete the approved card flow and wait for confirmation.
- **Credit:** attach the correct customer first. Credit must be enabled and available for that customer.

Do not retry after a completion message. Check Sales first to avoid a duplicate transaction.

## Barcode problems

1. Search by product name or SKU so checkout can continue.
2. Check that the barcode belongs to the intended product.
3. Remove extra spaces or characters in the stored value.
4. Confirm the scanner is sending input to the active field.
5. Test a second known barcode.

DRX supports barcode scanning but does not guarantee every scanner or barcode format.

## Payment does not complete

1. Read the message before retrying.
2. Confirm stock, customer credit, and workspace.
3. Check whether the sale already appears in Sales.
4. Retry only when no completed sale exists.
5. If the exit control asks for a manager process, follow the workspace policy rather than closing the browser during payment.

## Receipts

Choose the receipt option before finishing. SMS requires an attached customer with a usable phone number and consent to use it. If printing fails, keep the sale reference and reprint from Sales history when available.

## What to record for support

- Workspace
- Operator role
- Approximate time
- Product or sale reference
- Payment type, without card details
- Exact error text
- Whether a completed sale appears in Sales
