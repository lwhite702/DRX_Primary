---
title: "Troubleshoot Workspace and Access"
description: "Fix workspace mix-ups and permission denials in DRX so actions apply to the right tenant and you can continue your work."
tags:
  - DRX
  - workspaces
  - access
  - troubleshooting
---
## Overview

This guide helps you fix common workspace and access issues in DRX (Deelrx CRM). Use it when you can’t find the right data, you see a “no access” message, or you realize an action happened in the wrong workspace (tenant).

## Before you start

- You have an active DRX account and can sign in.
- You are a member of the workspace you want to use.
- Your role in that workspace includes permission for the action (checkout, inventory, reports, etc.).
- You know which workspace you intend to work in (for example, the correct store, region, or brand).

## I don’t see the sales, products, or reports I expect

This happens when you’re in the wrong active workspace. DRX keeps each workspace separate, so data only appears in the workspace you’ve selected.

1. **Confirm** your active workspace. Look for the current workspace indicator in the interface (often near your profile or app header).
2. **Switch** to the correct workspace. Use the workspace selector to choose the business or location you intend to work in.
   - Pick the exact workspace name that matches where the sale or inventory was recorded.
3. **Refresh** the page or reopen the section you were using (for example, Sales History, Inventory, or Reports) to load the correct data.
4. **Retry** your task in the correct workspace.

## I get a permission or access denied message

You may be in the right workspace but lack the required role-based access for that action in that workspace.

1. **Check** you are in the intended workspace using the workspace indicator.
2. **Try** a read-only view first (like Sales History or Dashboard) to confirm workspace access works at all.
3. **Contact** your workspace admin and request the appropriate role for that workspace.
   - Tell them the exact action you need (for example, inventory adjustments, processing checkouts, or pulling reports).
4. **Sign out and sign in** after your role is updated, then **retry** the action.

## I completed a task in the wrong workspace

If you ran a checkout, inventory intake, adjustment, or other action in the wrong tenant, it will be recorded in that workspace’s audit trail.

1. **Stop** further actions until you confirm the correct workspace to avoid more mistakes.
2. **Note** the details of what happened: action type, time, item(s), quantity, amounts.
3. **Switch** to the correct workspace using the workspace selector.
4. **Correct** the impact according to your policy.
   - For inventory: create an offsetting adjustment in the wrong workspace if needed, then apply the intended change in the correct workspace.
   - For sales: follow your workspace’s reversal or refund process, then re-run the sale in the correct workspace.
5. **Review** the audit trail and reports in both workspaces to ensure balances and history look correct.

## I can’t switch workspaces or a workspace is missing

This occurs when your account isn’t linked to that workspace or your membership was removed.

1. **Open** the workspace selector and **look** for the workspace name.
2. If you don’t see it, **confirm** you were added to that workspace under the same email you use to sign in.
3. **Contact** the workspace admin and request to be added.
   - Share the exact workspace name you need and the role required for your tasks.
4. **Sign out and sign in**, then **try** the workspace selector again.

## My dashboard counts don’t match what I see in inventory or sales

You might be comparing data across different workspaces or mixed time periods.

1. **Confirm** the active workspace in both places you are comparing.
2. **Match** filters and dates in each view (for example, Today vs. Last 7 Days) within the same workspace.
3. **Refresh** both views after switching workspaces or changing filters.
4. **Re-check** the totals. If they still differ, **review** recent actions in the audit trail for late changes in that workspace.

## I’m asked to confirm a workspace and I’m not sure which one to pick

DRX asks you to confirm your workspace so your actions apply to the right tenant.

1. **Pause** and **identify** where the task should live (store, region, or brand).
2. **Select** that workspace when prompted.
3. **Verify** the workspace indicator before you continue with sensitive actions like inventory adjustments, payments, or refunds.

## Best practices to avoid workspace mistakes

- Always check the workspace indicator before checkouts, adjustments, refunds, or report exports.
- Keep workspace names clear and distinct to reduce confusion.
- Finish one workspace’s tasks before switching to another.
- If you manage multiple locations, set a short routine: confirm workspace, confirm filters, then act.

## Still need help

- Recheck your active workspace and your role in that workspace.
- If you cannot switch workspaces or continue seeing access errors, contact your workspace admin to confirm your membership and role.
- If your business uses centralized IT, your admin may escalate to DRX support with your action details, timestamp, and workspace name.
