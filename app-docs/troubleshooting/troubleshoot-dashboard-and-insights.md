---
title: "Troubleshoot Dashboard and Insights"
description: "Fix missing or delayed sales data, best-seller lists, category splits, and location filters in DRX dashboards. Resolve customer alias issues, attaching profiles at checkout, and applying or redeeming store credit."
tags:
  - DRX
  - dashboard
  - insights
  - customers
---
## Overview

This guide helps you fix common issues in DRX dashboards and customer workflows. You will resolve missing or delayed sales data, best-seller lists, category splits, and location filters, and also fix problems with customer aliases, attaching profiles at checkout, and applying or redeeming store credit.

## Before you start

- Confirm you can log in to DRX and access the dashboard on desktop.
- Check your role. Some views and actions require Admin or Manager access; Operators have limited reporting access.
- If you manage multiple storefronts, confirm you can view separate store data and location-based reporting.

## Sales data looks missing or delayed on the dashboard

You might see today’s snapshot or Operations Insights totals that seem lower than expected, or recent checkouts not reflected yet.

1. **Refresh** the page to reload the daily snapshot and activity tiles.
2. **Confirm** you are viewing the correct date range in Operations Insights (daily, weekly, or monthly).
3. **Switch** to the correct storefront if you operate multiple locations to ensure you are not viewing another store’s data.
4. **Verify** that recent sales were completed, not voided or refunded, in your activity logs by user.
5. **Check** your role permissions. If your access is limited, ask an Admin or Manager to confirm you can view reporting data.
6. **Reopen** the dashboard on desktop if you were using a mobile device; the full dashboard is available on desktop.

- If slices or downloads are marked as beta, they may not update in real time. View the core snapshot for the most current totals.

## Best-seller list is empty or incorrect

Your best sellers may not appear or show unexpected items in Operations Insights.

1. **Confirm** you are in the correct date range (daily, weekly, or monthly) so the right period is counted.
2. **Filter** to the intended storefront to avoid mixing multi-location totals.
3. **Review** inventory activity to ensure items were sold (not returned or adjusted) during the selected period.
4. **Reload** the page to refresh the best-seller tiles.
5. **Avoid** relying on beta “deeper slices” for immediate accuracy; use the main best-seller view for the latest snapshot.

## Category splits do not match expected totals

Category breakdowns can look off if the wrong period or location is selected, or if inventory adjustments were made.

1. **Select** the exact period you want in Operations Insights to align totals.
2. **Choose** the correct storefront if you manage multiple locations.
3. **Check** recent inventory adjustments and refunds in activity logs; these can affect category totals.
4. **Refresh** the dashboard to apply the latest data.

## Location filters show the wrong store or combine data

If your dashboard totals look blended or you are seeing another store’s numbers, the location view may not match your intent.

1. **Switch** to the intended store view. Separate store views and location-based reporting are available in the dashboard.
2. **Confirm** your role allows viewing multiple storefronts; Operators may have restricted views.
3. **Reload** Operations Insights after changing the location to update the tiles and totals.

## Can’t create or find a customer alias

Aliases let you track customers with minimal data. You may not see a profile you expect, or you may be unsure if enough information was saved.

1. **Search** for the alias in Customers using the exact alias text you entered previously.
2. **Create** a new customer if the alias does not exist. Aliases can be saved with minimal information; contact fields are optional.
3. **Add** optional notes or tags if available in your workspace (beta) to help you find the profile later.
4. **Avoid** collecting unnecessary personal data. DRX supports alias-first privacy and minimal data collection.

## Profile does not attach at checkout

You might complete a sale without a customer profile linked, or the intended alias is not connected.

1. **Search** for the customer alias during the checkout flow and select it before completing the transaction.
2. **Create** the profile on the spot if you cannot find it, then **attach** it to the current sale.
3. **Confirm** your role allows attaching profiles at checkout; ask an Admin or Manager to adjust permissions if needed.
4. **Review** the completed sale in Customers to ensure purchase history appears under the correct profile.

## Store credit can’t be applied or redeemed

You may not see a customer’s credit, or the sale completes without applying it.

1. **Open** the customer’s credit management page under Credit and confirm available credit is listed.
2. **Attach** the correct customer profile to the sale before payment so credit can be recognized.
3. **Apply** available credit during checkout according to the on-screen payment options.
4. **Review** your permissions. Applying or adjusting credit may be restricted to Managers or Admins.
5. **Check** activity logs if credit was adjusted recently to confirm who made changes and the current balance.

## Still need help

- Recheck your role and permissions with your workspace admin if views or actions are unavailable.
- Verify you are on the correct store and time period before comparing totals.
- If data still looks wrong after refresh and role checks, contact your workspace admin to review activity logs and sensitive actions like refunds or inventory adjustments.
