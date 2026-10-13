---
title: "Switch businesses and check access"
description: "Choose the correct business and give each team member only the access their work needs."
---

![Two workspaces connect to separate groups of scoped team access.](../_assets/help-center/headers/workspaces-and-access.webp)

If you juggle two dispensary locations, an annex stockroom, or a retail store and an event pop-up, you know the absolute terror of accidentally ringing up an ounce under the wrong shop's tax ID. DRX keeps your locations strictly separated so inventory, cash drawers, and customer records never bleed into one another.

Here is how to switch between business locations smoothly and set up your crew with exactly the permissions they need—no more, no less.

## Before you flip the switch

Finish whatever you are doing before switching shops. 
- If you have an active customer standing in front of you with a cart full of pre-rolls, ring it up or park the cart first. 
- Switching stores while halfway through building an order drops you into a brand new context. Each business maintains its own live inventory counts, customer tabs, and sales ledgers.

![Illustrative business selector and Manage Team panels with fictional business and member names.](../_assets/help-center/screenshots/workspace-team.png)

*Illustrative screen with fictional data.*

## Switching stores across your devices

<Tabs>
  <Tab title="Desktop Web">
    1. Look up at the top navigation header and click **Select a business** (or your current store name).
    2. Under **My Businesses**, click the location you want to operate.
    3. Watch the header update. Confirm the shop name in the top corner before clicking into **Sales**, **Products**, or **Customers**.
    4. If you have multiple tabs open in your browser, refresh them so you are not accidentally ringing up carts in yesterday's location.
  </Tab>
  <Tab title="Native iOS (SwiftUI)">
    1. Tap the **Business** tab (or gear icon) in the bottom navigation bar to open `WorkspacesView`.
    2. Check the **Current business** section at the top. You will see the active **Business Name**, your logged-in **Team member** name, and your assigned **Role** (such as Cashier or Manager).
    3. To switch storefronts on a shared shop iPad, tap **Sign Out of Deelrx CRM**, then sign in with the credentials assigned to that terminal or store location.
    4. Verify that the register pulls in the correct catalog and local drawer before taking your first customer.
  </Tab>
  <Tab title="Android & Mobile Web">
    1. Tap **More** in the bottom tab bar.
    2. Right beneath your profile card, check the **Connected to business** storefront banner to verify which shop you are currently logged into.
    3. If you need to switch to your sister store, tap **Sign Out**, confirm the prompt, and sign in with the store account for your other branch.
    4. The mobile dashboard immediately refreshes its local catalog and delivery queues for that chosen location.
  </Tab>
</Tabs>

## Inviting team members and setting roles

Don't hand your store owner password to every weekend budtender. DRX lets you invite staff members with distinct, role-scoped access:

1. On Desktop Web, click **Settings** in the main sidebar, then select **Manage Team**.
2. Scroll to **Invite a Team Member** and enter their work **Email address**.
3. Choose the appropriate **Role** from the dropdown:
   - **Cashier**: Can search catalog items, build carts, accept cash and card payments, and look up customer store credits. They cannot alter past sale records or edit core business settings.
   - **Supervisor**: Can approve discounts, void active tickets, handle customer profile updates, and oversee register shift reconciliations.
   - **Manager**: Can receive bulk inventory shipments, perform stock counts, edit product retail prices, and view store performance dashboards.
   - **Staff**: General operational access for floor runners and delivery fulfillment.
4. Click **Send Invitation**. 
5. The employee receives an invitation link where they create their own secure password. Never share accounts—individual logins protect your cash drawer and keep your shift audit trails honest.

## Reviewing or removing access

People move on, and temporary seasonal help packs up. Keep your roster tidy:

- Regularly open **Manage Team** in **Settings** to review your active list of **Team Members**.
- Double-check role assignments before promoting or adjusting permissions.
- When an employee departs, revoke their invitation or contact store ownership immediately to retire their login access.
- Changing a role does not automatically kick someone out mid-keystroke if their session is cached; ensure they log out of store hardware at the end of their final shift.

## Related articles

- [Privacy and minimal data](feature-overview-privacy-controls.md)
- [Troubleshoot business access](../troubleshooting/troubleshoot-workspace-and-access.md)

