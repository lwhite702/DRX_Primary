---
title: "Privacy and minimal data"
description: "Choose what customer information to keep and understand when retention cleanup permanently deletes it."
---

![Three retention choices lead to a clear permanent-deletion boundary.](../_assets/help-center/headers/privacy-and-minimal-data.webp)

In regulated retail, holding onto massive troves of customer personal data is a liability waiting to happen. You don't need to know a patron's home address, grandmother's maiden name, or shoe size just to sell them an eighth of sour diesel. 

DRX was built from the ground up on a "minimal data" philosophy. You collect only what you strictly need to complete the sale, manage store credit tabs safely, and satisfy local compliance. Once a casual customer stops visiting, DRX sweeps away their old records automatically.

![Alias Mode is 30 days, Standard Mode is 180 days, and Full Customer Mode is 365 days before qualifying inactive records are permanently deleted when cleanup runs.](../_assets/help-center/diagrams/privacy-retention-timeline.png)

## The three privacy presets

You can set your shop's privacy profile depending on how much customer info you actually need to operate:

- **Alias Mode (30 Days)**: Maximum stealth. You collect only customer nicknames or code names (like "Blue Hoodie" or "Big Mike"). Inactive customer records are scheduled for permanent purge after **30 days** of zero visits. Perfect for high-volume cash counters where privacy is paramount.
- **Standard Mode (180 Days)**: The balanced sweet spot. You store an alias plus an optional phone number or email for digital receipt delivery. Inactive records are retained for **180 days** before automated cleanup.
- **Full Customer Mode (365 Days)**: Complete customer profiles, loyalty history, and delivery addresses. Inactive accounts are retained for **365 days** (one full calendar year) before scheduled cleanup.

![Illustrative Privacy Protocol Dashboard showing the three presets and retention cleanup settings.](../_assets/help-center/screenshots/privacy-settings.png)

*Illustrative screen with fictional data.*

## Configuring privacy across your platforms

<Tabs>
  <Tab title="Desktop Web">
    1. Click **Settings** in the main sidebar.
    2. Under **Privacy Protocol Dashboard**, find the **Onboarding Profile** section.
    3. Choose your desired preset: **Alias Mode**, **Standard Mode**, or **Full Customer Mode**. Notice how the retention schedule updates automatically.
    4. Review your cleanup automation:
       - **Enable retention cleanup**: Toggle on to automate scheduled data purges.
       - **Days**: Adjust the retention window if your shop policy requires a specific timeframe.
       - **Local hour (0–23)**: Choose an off-peak overnight hour (like 3 AM) so cleanup runs when registers are idle.
       - **Hard delete inactive records**: Permanently clears qualified customer rows.
    5. Click **Save Settings**.
  </Tab>
  <Tab title="Native iOS (SwiftUI)">
    1. Open the **Business** tab (`WorkspacesView`) or Settings on your iPad register.
    2. Review your terminal's active store connection and privacy indicators.
    3. Register screens automatically honor your store's screen masking rules—hiding phone numbers and real names behind aliases when facing the customer counter.
    4. Store-wide retention rules configured by your manager govern which customer profiles sync down to the local register search index.
  </Tab>
  <Tab title="Android & Mobile Web">
    1. Tap **More** in the bottom navigation tab, then select **Settings**.
    2. Review the active privacy policy applied to your mobile register.
    3. Mobile search results respect alias masking so customer contact details aren't exposed on handheld screens during deliveries.
  </Tab>
</Tabs>

## The golden rule of automated cleanup

When retention cleanup runs, **it permanently deletes qualified records**. It doesn't just hide them behind an archive tab; they are purged.

Here is the crucial safeguard: **DRX will never delete a customer who owes you money or holds an active store tab**. If a customer has an open balance or an unresolved transaction, the cleanup engine skips them entirely, keeping your accounts receivable intact.

## Screen privacy at the counter

Ever had a nosey customer leaning over the counter trying to read what is on your POS screen? We have too.

- **Screen privacy** dynamically masks sensitive fields (such as phone numbers, email addresses, and past order notes) on register screens.
- Budtenders only see the customer's alias and current order cart.
- Enabling screen privacy protects customer confidentiality without changing your underlying stored records or deleting any data.

## Related articles

- [Help and support](help-and-support.md)

