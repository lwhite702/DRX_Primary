---
title: "Troubleshoot Checkout and Payments"
description: "Fix issues with cart updates, tender selection, split payments, customer credit, and receipt printing or sharing in DRX Quick POS."
tags:
  - checkout
  - payments
  - POS
  - receipts
---
## Overview

This guide helps you fix common problems during Quick POS checkouts in DRX. It covers cart issues, tender selection, split payments, posting credit and credit payments, and receipt printing or sharing. Use the steps below to recover quickly and keep your line moving.

## Before you start

- You can open Quick POS and are signed in to the correct workspace.
- Your role allows taking payments and posting credit or credit payments.
- You know your location’s allowed tenders (cash, card, credit, Zelle, mixed) and any required reference notes.

## Items do not appear or totals look wrong in the cart

You may notice missing items, doubled lines, or taxes/discounts not reflected in the cart during a fast sale.

1. **Review** the cart line items.
   - Confirm each item, quantity, and price looks right.
   - Check that any intended discounts are visible on the line or in the totals.
2. **Remove** incorrect lines.
   - Use the cart control to delete an extra or wrong item.
3. **Add** the correct items again.
   - Scan or search and add the item back; verify quantity before proceeding.
4. **Refresh** the totals.
   - Confirm subtotal, tax, and total update after your edits before choosing a tender.

## The tender list is missing an option you need

At checkout you might not see “Cash,” “Card,” “Credit,” “Zelle,” or a way to combine tenders.

1. **Reopen** the payment screen.
   - Back out to the tender selection, then open it again to reload available options.
2. **Confirm** the sale total is greater than zero.
   - Some tenders do not show for zero-amount carts; add items or remove full discounts if unintended.
3. **Check** with your workspace admin about allowed tenders.
   - If a tender is disabled for your location or role, it will not appear in Quick POS.

## Split payment will not complete

When a customer pays with multiple tenders, the payment may not post if the amounts do not cover the total.

1. **Enter** the first tender amount carefully.
   - Type the exact amount being paid by the first tender; confirm it is less than or equal to the total.
2. **Apply** the second (or next) tender.
   - The remaining balance should update; select the next tender and enter its amount.
3. **Verify** the remaining balance is zero.
   - If there is a small remainder, adjust one tender amount to match the exact total before completing.
4. **Complete** the sale only after balance reaches zero.
   - Do not exit the payment screen until the balance shows zero and the sale confirms as complete.

## Credit cannot be posted for the customer

If you try to extend credit at checkout but the sale will not complete, the customer may not be set for credit or a required note is missing.

1. **Select** “Credit” as the tender and review the prompt.
   - If a reference note is required, a field will appear.
2. **Enter** the reference note.
   - Add a short description such as a PO, internal note, or agreement reference.
3. **Confirm** the customer is attached to the sale.
   - Credit requires a customer; add the correct customer before completing.
4. **Complete** the sale to post credit.
   - The balance moves to the customer’s credit to follow up later in credit pages.

## Taking a payment against existing credit fails

When a customer pays down credit in Quick POS, the payment may be rejected if details are incomplete.

1. **Attach** the correct customer to the sale.
   - Ensure the customer with the outstanding credit is selected.
2. **Select** the tender the customer is using to pay.
   - Choose “Cash,” “Card,” “Zelle,” or other allowed tender.
3. **Enter** the payment amount to apply to credit.
   - Use the exact amount the customer is paying today.
4. **Add** a reference note if required for the tender.
   - For example, include a Zelle note or transaction reference.
5. **Complete** the sale.
   - The payment posts and reduces the customer’s outstanding credit.

## Zelle or other non-cash tender requires a note

Some tenders require a reference so you can reconcile later.

1. **Choose** the tender (for example, “Zelle”).
2. **Enter** the reference in the note field.
   - Include details needed for later lookup, such as the sender name or confirmation code.
3. **Complete** the sale.
   - If the field is required and empty, the sale will not finish.

## Receipt will not print

After completing a sale, the receipt may fail to print due to printer availability or a mis-click.

1. **Confirm** the sale is completed.
   - Look for the sale confirmation before attempting to print.
2. **Select** “Print Receipt.”
   - Reopen the print action from the completed sale screen.
3. **Check** the printer is connected and ready.
   - If you have more than one printer, choose the correct one when prompted.
4. **Reprint** from Sales if needed.
   - Open Sales, find the sale, then print the receipt from the sale detail.

## Receipt cannot be shared digitally

If the customer wants a digital copy and sharing fails, send it again from the completed sale.

1. **Open** the completed sale screen.
2. **Select** the share option.
   - Choose the available method (for example, email or share link, if enabled for your workspace).
3. **Confirm** the recipient details and **send**.
4. **Resend** from Sales if needed.
   - Go to Sales, open the sale detail, and share the receipt again.

## The sale looks wrong after completion

If there is a dispute or mismatch, verify the final items, totals, and tenders in Sales.

1. **Open** Sales and search for the sale.
   - Use date, amount, or customer to find it.
2. **Open** the sale detail and **review** items and payments.
   - Verify each item, subtotal, tax, total, and tender references.
3. **Document** any corrections needed.
   - If you need to adjust credit or note a reconciliation follow-up, record that according to your team’s process.

## Still need help

- Recheck the customer is attached when using credit or paying down credit.
- Make sure tender amounts exactly match the remaining balance when splitting payments.
- Confirm any required reference notes are filled before completing.
- If problems continue, contact your workspace admin. They can confirm your role permissions and which tenders are enabled for your location, and review printer or sharing settings.
