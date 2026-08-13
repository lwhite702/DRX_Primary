---
title: "Barcode scanners and receipts"
description: "Connect a barcode scanner, choose receipt printing or email receipts, and verify your DRX checkout hardware for faster sales."
tags:
  - POS
  - hardware
  - barcode
  - receipts
---
## Overview

This guide helps you connect a barcode scanner and set up receipts in DRX so checkout stays fast and accurate. You will scan items during Quick Sale or the POS flow, then print or email receipts at payment.

## Before you start

- A DRX account with access to checkout (Quick Sale or the POS flow).
- Your barcode scanner powered on and paired with your device (USB or Bluetooth) so it types numbers into a text field.
- A receipt solution chosen: a connected printer managed by your computer or tablet, or an email address for the customer.
- Test items in your DRX inventory with barcodes saved on the products.

## Connect

1. **Open** DRX and go to Quick Sale or start the POS flow at “/pos/sale”.
2. **Place the cursor** in the product search or scan field where you normally add items to the cart.
3. **Scan** a product barcode with your scanner. You should see the barcode digits appear briefly, and the matching item added to the cart.
4. If nothing is added, **type** a product name to confirm search works, then **rescan** the barcode to test the scanner input.

For receipt printing:

5. **Confirm** your printer works from your device outside DRX (print a test page from your system’s Print dialog). DRX uses your device’s standard printing.
6. **Proceed** through the POS flow from “/pos/sale” to “/pos/payment”. After taking payment, continue to “/pos/complete”.
7. **Use** the system Print option presented on completion, or **open** your browser or device print dialog when the receipt view appears, then **select** your receipt printer and **print**.

For email receipts:

8. **Attach** a customer at checkout by using the customer field in the payment step (“/pos/payment”).
9. After payment, at “/pos/complete”, **choose** the option to email the receipt and **confirm** the customer’s email address.

## Configure

- Barcode scanning behavior:
  - Keep the cursor in the add-item field while ringing items so scans go directly to the cart.
  - Most retail scanners send an “Enter” after each scan; if yours does not, press Enter after scanning to add the item.
- Receipts:
  - Printing: Select your receipt printer in your device’s print dialog when the receipt displays on “/pos/complete”.
  - Email: Attach a customer at “/pos/payment” so the receipt can be sent to the saved email.
- Discounts and payments:
  - Apply discounts, take multiple payment types, and then issue the receipt from the completion screen.

## Verify it works

- Scan test: With the cursor in the add-item field on “/pos/sale”, scanning a known product adds it to the cart instantly.
- Checkout flow: Moving from “/pos/sale” → “/pos/payment” → “/pos/complete” shows the receipt view at the end of a successful payment.
- Print receipt: The device print dialog opens and your selected printer produces a readable receipt.
- Email receipt: The customer receives the receipt at the email saved on their profile.

## Disconnect or change access

- Barcode scanner: Unplug the USB cable or disconnect Bluetooth from your device settings. To switch scanners, connect the new scanner and repeat the scan test on “/pos/sale”.
- Printer: Change or remove the printer in your device’s print dialog when you print the receipt. To stop printing, cancel the print dialog at “/pos/complete”.
- Email receipts: To stop emailing receipts, do not attach a customer during checkout, or skip the email option on the completion screen. To use a different email, attach the correct customer at “/pos/payment”.
