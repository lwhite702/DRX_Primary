---
title: "Troubleshoot POS and payments"
description: "Fix common DRX checkout issues in one place: scanning items, cart actions, discounts, payment failures, receipts, and completing a sale."
tags:
  - POS
  - payments
  - receipts
  - discounts
---
## Overview

This guide helps you fix common checkout issues in DRX when running sales from Quick Sale or the POS flow. Use it to resolve problems with barcode scanning, cart actions, discounts, taking payments, printing or emailing receipts, and completing a sale.

If you can open a sale but get stuck at any step, follow the matching section below to finish the checkout.

## Before you start

- You can open DRX and access Quick Sale or the POS flow.
- You have permission to run sales and accept payments in your workspace.
- Your barcode scanner is connected and in keyboard (wedge) mode if you scan items.
- Your card reader or payment method is powered on and available, if you accept cards.

## Items do not scan into the cart

You scan a barcode on Quick Sale or during the POS flow, but nothing appears in the cart.

1. **Click** into the item search or cart area so it has focus, then **scan** again.
2. **Type** part of the item name in search and **select** the item to confirm it exists and has a barcode saved.
   - If the item appears by name but not by scan, the barcode may not match your stock label.
3. **Scan** a second item to rule out a damaged label. If only one item fails, **add** it by search for this sale and **relabel** the product after checkout.
4. **Check** the scanner’s connection (USB/Bluetooth) and that it sends an Enter/Return after the code. If unsure, **use** manual search to complete the sale and **reconnect** the scanner between customers.

## Item appears, but the quantity or price is wrong

You add an item and notice an unexpected price or quantity in the cart.

1. **Select** the line item in the cart.
2. **Update** the Quantity to the correct number.
3. **Review** the unit price shown. If a temporary deal applies, **apply** a discount instead of editing the price.
4. **Remove** and re-add the item if the price still looks off, then **proceed** with the sale and **correct** the product record after the transaction if needed.

## Discount does not apply as expected

You try to discount a line item or the whole cart, but the total doesn’t change as intended.

1. **Select** the line item if discounting a single product, or **open** the cart total area for an order-level discount.
2. **Choose** the correct discount type (amount or percent) and **enter** the value.
3. **Confirm** the updated subtotal/total before payment. If it didn’t change, **clear** any existing discount, then **re-apply** the new discount.
4. **Review** item-level vs order-level discounts. If both are applied, the final total reflects both; **remove** one if that’s not desired.

## Cannot attach a customer at checkout

You want to link a customer to the sale, but search returns no result or won’t attach.

1. **Open** customer search on the sale and **type** the customer’s name, email, or phone.
2. **Select** the correct customer from results to attach. If no match, **complete** the sale without attachment and **add** the customer to your directory afterward.
3. **Check** for typos or extra spaces in the search. **Try** a different identifier (email or phone) if name search is broad.

## Payment is declined or fails to authorize

You reach payment, but the card or method is declined, times out, or returns a failure message.

1. **Confirm** the total on screen, then **ask** the customer to present the payment again.
   - For cards, ensure the reader is powered and the card is inserted, tapped, or swiped only once.
2. **Select** a different payment type if available (e.g., another card or cash) and **complete** the sale.
3. If the failure persists, **cancel** the payment attempt (not the entire sale), then **retry** payment from the same sale.
4. **Avoid** double charges: if you are unsure whether a charge went through, **check** the transaction history after the attempt before trying again.

## Split payment won’t complete

You need to take multiple payment types or cards, but the sale doesn’t finish after the first part.

1. **Enter** the first amount for the initial payment and **confirm** it completes.
2. **Add** the next payment method and **enter** the remaining balance exactly as shown.
3. If a partial leaves a small remainder, **adjust** the final payment to match the balance and **finish** the transaction.
4. If a split fails mid-way, **void** only the failed leg if prompted, then **re-attempt** that leg or **settle** the balance with a different method.

## Cash payment does not show correct change

You accept cash and the change due looks wrong.

1. **Enter** the amount tendered by the customer, not the total due.
2. **Review** the calculated change due before confirming the payment.
3. If it still looks incorrect, **remove** the cash payment, **re-enter** the tendered amount, and **confirm**.

## Receipt will not print or email

You finish payment but the customer receipt does not send or print.

1. **Open** the completed sale and **select** the option to Print or Email the receipt again.
2. For printing, **check** the printer is connected and has paper; then **re-try** Print from the completed sale screen.
3. For email, **confirm** the customer’s email is attached and **resend**. If no customer is attached, **add** an email address and **send**.

## Stuck on the payment screen after success

You see a success message but cannot move to the completed sale.

1. **Wait** a few seconds for the sale to finalize and **avoid** refreshing the page.
2. **Select** the button to continue to the completed sale when it appears.
3. If it does not appear, **open** your transaction history in a new tab to confirm the sale recorded, then **return** and **proceed** to a new sale.

## Sale did not complete, but items remain in the cart

You canceled payment or it failed, and the cart still has items.

1. **Review** the cart and **remove** any items you no longer need.
2. **Re-add** items if the cart was cleared unintentionally.
3. **Restart** payment from the current cart and **complete** the sale.

## Quick Sale is slow or unresponsive at busy times

You use Quick Sale and the cart or payment takes longer than usual to respond.

1. **Limit** background activity on the device and **close** unused tabs.
2. **Use** barcode scanning or short search terms to speed item entry.
3. If performance briefly degrades, **finish** the current sale, then **refresh** the page before starting the next customer.

## Still need help

- Recheck that you can open Quick Sale or start a sale in the POS flow and that your payment hardware is powered and connected.
- If issues continue across multiple customers, contact your workspace admin to review device setup, payment methods, and user permissions.
