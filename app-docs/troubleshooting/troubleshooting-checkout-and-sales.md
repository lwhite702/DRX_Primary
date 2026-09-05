---
title: "Troubleshoot checkout and sales"
description: "Fix common issues in DRX when building a cart, applying discounts, attaching a customer, taking payment, or printing/sending a receipt in the Sales console."
tags:
  - checkout
  - sales
  - point of sale
---
## Overview

This guide helps you fix common problems in DRX when you ring up sales in the Sales console. Use it if you cannot add items to the cart, a discount does not apply, a customer will not attach, a payment will not complete, or a receipt will not send or print.

## Before you start

- You can sign in to your DRX workspace and open the Sales console.
- You have permission to handle sales at your location.
- Your device has internet access if your store relies on online payments or cloud receipts.
- Your payment hardware (if used) is powered, connected, and within range.

## Items do not add to the cart

This happens when a product is out of stock, the item cannot be found, or the Sales console is not focused on your current location.

1. **Search** for the product by name, SKU, or scan its barcode in the Sales console.
   - If search returns nothing, the item may not exist at this location.
2. **Check** stock status on the product line after it appears.
   - If you see an out-of-stock message or the quantity does not allow adding, choose another item or adjust stock later in inventory management.
3. **Switch** to the correct store location if you operate across locations, then try again.
4. **Refresh** the Sales console view to reload your catalog and retry adding the item.

## Discount does not apply to the sale

You may see this when a discount has conditions that the cart does not meet, or you try to stack discounts that cannot combine.

1. **Review** the discount label and any shown requirements in the Sales console.
   - Common requirements include a minimum quantity, a minimum subtotal, or specific eligible items.
2. **Adjust** the cart to meet the discount conditions, then try applying the discount again.
3. **Apply** the discount to the correct scope.
   - Use a line-level discount for one item or a cart-level discount for the whole sale, as available on screen.
4. **Remove** any conflicting discounts, then reapply the intended one.

## Cannot attach a customer to the sale

This occurs when the customer record is missing at your location, search details are too narrow, or the customer declines to share data.

1. **Search** for the customer using the least amount of information first (for example, first name or a short identifier).
2. **Select** the correct match from the results to attach to the sale.
3. **Create** a minimal new customer record only if you cannot find an existing one and the customer agrees to be added.
   - Collect only what is needed for the sale, in line with privacy preferences.
4. **Confirm** the customer now appears on the sale and proceed with checkout.

## Payment will not complete

You may run into this if the network is offline, the payment device is not connected, the amount exceeds limits, or the tender type is not supported.

1. **Confirm** the cart total is correct and includes taxes, fees, or delivery options you intend to charge.
2. **Choose** a supported tender type shown in the Sales console and start the payment.
3. **Check** your internet connection if the payment waits or fails.
   - Reconnect Wi‑Fi or use a reliable network, then retry.
4. **Verify** your payment device is powered and paired if you are using hardware.
   - Reseat cables, ensure Bluetooth is connected, or move closer to the device.
5. **Retry** the payment once the device and network are ready.
   - Do not run duplicate charges if the previous attempt shows as approved in the post‑sale view.

## Cannot split a payment across multiple tenders

The Sales console supports multiple tenders, but you must enter each part of the payment separately.

1. **Select** the first tender type and **enter** the partial amount you want to charge.
2. **Complete** the first payment, then return to the remaining balance.
3. **Choose** the next tender type and **collect** the rest until the balance reaches zero.

## Receipt did not print or send

This happens when the printer is offline, the customer contact method is missing, or the sale did not finish.

1. **Finish** the sale and open the post‑sale view for the completed transaction.
2. **Resend** the receipt using the available send or print options in the Sales console.
   - For email or SMS, ensure the customer record has the needed contact detail attached to the sale.
3. **Check** your printer status if printing fails.
   - Power on the printer, load paper, and confirm the connection.
4. **Try** printing from another device or location printer if available.

## Fees or delivery options are missing from the total

You may see this if optional charges were not added before taking payment, or they are not available for the items in the cart.

1. **Review** the cart before payment to confirm any required fees or delivery options appear in the total.
2. **Add** the needed fee or delivery option from the sale screen controls, then **verify** the updated total.
3. **Proceed** to payment only after the total matches what you intend to charge.

## The post‑sale view does not show expected details

This can occur if the sale is still in progress or if you are viewing a different sale record.

1. **Open** the detailed sales screen for the specific transaction you just completed.
2. **Compare** the items, discounts, tenders, and receipt status to what you collected at checkout.
3. **Refresh** the view and **reopen** the sale if details seem incomplete.

## Still need help

- Recheck your internet connection, device power, and any payment or printer hardware.
- Confirm you are working in the correct location and sale record.
- If issues persist, contact your workspace admin to review your access and device setup, or escalate to your support channel with the sale time, location, and a brief description of what you tried.
