---
title: "Troubleshoot Inventory and Audit"
description: "Fix issues with receiving stock, approvals, adjustments not applying, and missing movement history in DRX Inventory and Audit."
tags:
  - inventory
  - audit
  - pos
---
## Overview

This guide helps you resolve common DRX Inventory issues: receiving stock that won’t save, approvals holding changes, adjustments that don’t affect counts, and missing movement history. Follow the steps below to confirm required fields, approvals, roles, and where to find audit details.

## Before you start

- You have access to the correct workspace in DRX.
- Your role allows Inventory intake, adjustments, and viewing the audit trail.
- You know the product name or SKU you are working with.
- If approvals are used in your workspace, you know who can approve changes.

## You can’t record incoming stock

This happens when required intake details are missing or you don’t have permission to receive stock.

1. **Open** the Inventory area and locate the product you are receiving.
2. **Start** a stock intake and fill all required fields:
   - Product selection
   - Total cost
   - Received amount or weight
   - Optional: Supplier or delivery cost (if you track it)
3. **Enter** a clear reason if prompted. Reasons help maintain traceability and may be required.
4. **Review** any on-screen validation messages and complete missing fields.
5. **Save** the intake. If your workspace uses approvals, the intake may show as pending and not update stock yet.
6. **Ask** an approver in your workspace to review and approve the intake if it is pending.

Tips:
- If you can’t see or select the product, confirm you are in the correct workspace and the product exists.
- If “Save” is disabled, a required field is empty or invalid. Complete it and try again.

## Your intake was saved but stock didn’t increase

This usually means the intake requires approval or was saved as a correction that does not apply until approved.

1. **Check** the intake status where you created it. Look for an approval or pending indicator.
2. **Confirm** that “Total cost” and “Received amount/weight” are filled correctly. Incorrect values can prevent application.
3. **Request** approval from a user who can approve inventory changes in your workspace.
4. **Refresh** the product’s Inventory view after approval to confirm the new stock level.

## An adjustment saved but didn’t change the count

Adjustments in DRX require a precise action and a reason. If you used the wrong action or missed a reason, the change may not apply.

1. **Open** the product in Inventory and start an adjustment.
2. **Choose** the correct adjustment action:
   - Increase
   - Decrease
   - Set to (set an exact stock level)
3. **Enter** the quantity change (or target level for Set to).
4. **Provide** a required reason that explains the correction (for example, “cycle count correction”).
5. **Save** the adjustment. If approvals are enabled, the change may remain pending until approved.
6. **Verify** the stock after approval or after saving if no approval is needed.

## You can’t submit an adjustment because of missing fields

You may see validation messages if the action, quantity, or reason is missing.

1. **Select** an action (Increase, Decrease, or Set to).
2. **Enter** a valid number for the quantity or the final stock level.
3. **Type** a short, specific reason. This is required to keep the audit trail complete.
4. **Save** again and confirm there are no remaining validation messages.

## Movement history is missing or incomplete in Audit

Use Inventory > Audit to see movement history. If entries are missing, check filters, approvals, and roles.

1. **Open** Inventory > Audit for the workspace and product you are reviewing.
2. **Clear** or **Adjust** filters that might hide records (for example, date range or product selection).
3. **Confirm** that related intakes or adjustments were actually saved and, if required, approved.
4. **Look** for sales events in the same timeframe. The audit trail compares intake, adjustments, and recent sales to explain stock deltas.
5. **Recheck** pending items. Pending changes do not appear as applied movement until approved.

## You don’t see Inventory or Audit options

This is usually a role or workspace access issue.

1. **Confirm** you are signed in to the correct workspace.
2. **Ask** your workspace admin to verify your role includes access to Inventory and Audit.
3. **Try** again after your access is updated.

## An approver can’t find your pending change

Pending intakes and adjustments must be reviewed by someone with approval permissions.

1. **Share** the product name or SKU and the approximate time you created the change.
2. **Ask** the approver to review pending inventory changes for that product.
3. **Verify** in Inventory or Audit after approval that the change is now reflected.

## Still need help

- Recheck that all required fields are complete, the correct action is selected, and a clear reason is provided.
- Confirm whether your workspace requires approvals and that an approver has reviewed pending changes.
- If issues persist, contact your workspace admin to review your role, approvals, and access to Inventory and Audit.
