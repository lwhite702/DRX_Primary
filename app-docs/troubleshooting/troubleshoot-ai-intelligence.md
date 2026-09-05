---
title: "Troubleshoot AI Intelligence"
description: "Fix missing or outdated AI recommendations, resolve apply/override errors, and confirm audit trail visibility for AI-driven pricing and restock suggestions in DRX."
tags:
  - DRX
  - AI Intelligence
  - pricing
  - inventory
---
## Overview

This guide helps you fix three common issues with AI Intelligence in DRX: missing or outdated recommendations, errors when applying or overriding suggestions, and trouble finding the audit trail. Follow the steps below to get fresh pricing and restock guidance, successfully apply changes, and confirm records of what changed and why.

## Before you start

- You can sign in to your DRX workspace.
- You have permission to view inventory and pricing in DRX.
- You can edit item details if you plan to apply or override AI suggestions.

## AI recommendations are missing

Use this when you expect AI-suggested prices or restock quantities but you see no suggestions for an item or list.

1. **Confirm** you are looking at items that DRX can evaluate. Items without recent sales or stock data may not produce suggestions.
2. **Check** that the item is active and has a current stock level and cost. If the item is archived or has incomplete details, add or correct the information, then return to the item.
3. **Refresh** the view where you expect to see suggestions. Close and reopen the item or list, or reload the page to fetch the latest AI output.
4. **Review** date ranges or filters in your current view. If you filtered to a category, brand, or time window with no data, clear the filters and check again.
5. **Verify** that suggestions are not already applied. If the current price or restock quantity matches what you expect from AI, the recommendation may have been applied and removed from the suggestion list.

- If suggestions still do not appear for specific items, note their names or SKUs for your admin.

## AI recommendations look outdated

Use this when suggestions are present but seem out of date compared to recent sales, costs, or stockouts.

1. **Confirm** the item details are up to date. Update cost, current stock, and any recent vendor changes on the item, then return to the suggestions.
2. **Refresh** the view to load the latest AI output. Close and reopen the item or reload the page.
3. **Compare** the suggestion date (if shown in your view) to today. If there is a visible timestamp and it is recent, the data may already be current.
4. **Spot-check** a few items with known recent activity. If only certain items look stale, update those item details and check again.
5. **Override** the suggestion if it’s clearly off. Enter the correct price or restock quantity and include a brief note so the context is captured in the audit trail.

- If all items look out of date after a refresh, capture a screenshot and contact your workspace admin.

## Error when applying a recommendation

Use this when clicking to apply an AI-suggested price or restock quantity shows an error or nothing changes.

1. **Confirm** you have permission to edit pricing or inventory. If you don’t have edit access, ask your workspace admin to adjust your role or apply the change for you.
2. **Check** for required fields on the item (cost, barcode/SKU, or stock) and complete any missing details. Incomplete item data can block updates.
3. **Retry** the apply action once. If the button appears disabled, hover or tap to read any on-screen message explaining what’s needed.
4. **Clear** any conflicting edits. If someone else is editing the same item, wait for them to finish, then try again.
5. **Apply** the change directly as a manual edit if the suggestion will not apply. Enter the price or restock quantity yourself and add a note to document the reason.

- If the error repeats across multiple items, record one example item and the exact message for your admin.

## Error when overriding a recommendation

Use this when entering your own price or restock quantity fails or your note will not save.

1. **Enter** a valid value. Use a positive number for price and a whole number for restock quantity; remove symbols or text from the value field.
2. **Add** a short reason in the note field, if required in your workspace. Keep the note under any visible character limit.
3. **Save** again after resolving any on-screen validation messages.
4. **Check** that no other user is editing the same item. If needed, close and reopen the item and re-enter your override.
5. **Try** a different item to confirm whether the problem is item-specific. If only one item fails, review its required fields and complete them.

- If overrides fail broadly, collect a screenshot and share it with your workspace admin.

## Can’t find the audit trail

Use this when you need to see who applied or overrode an AI suggestion and when it happened.

1. **Open** the item you are reviewing and look for a history or activity area on the item details.
2. **Filter** or **scroll** the activity to find entries that reference applied or overridden AI recommendations.
3. **Check** that your view includes notes. If you cannot see notes, ask your workspace admin to confirm your access.
4. **Compare** the current price or restock quantity to the latest entry to ensure you are looking at the most recent change.

- If you still cannot locate the audit trail for an item, provide the item name or SKU and the approximate date of change to your workspace admin.

## Suggestions are not blocking checkout, but I’m worried about accuracy

Use this when you are concerned that pricing or restock suggestions might affect live sales.

1. **Review** the note that AI suggestions never block checkout. Sales can proceed even if suggestions are missing or pending.
2. **Verify** current prices on items with active promotions or recent supplier changes and override as needed.
3. **Monitor** demand trends and restock quantities for fast-moving items and adjust where necessary. Add a note for each manual change to keep the audit trail complete.

## Still need help

- Recheck item details: cost, stock level, SKU/barcode, and active status.
- Refresh the page after making edits to load the latest AI output.
- If problems persist, contact your workspace admin with item names/SKUs, screenshots of errors, and the time you attempted the change.
