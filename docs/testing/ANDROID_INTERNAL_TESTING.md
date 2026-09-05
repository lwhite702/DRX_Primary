# DRX Android internal testing

Issue: WRE-49

This runbook is for authorized internal testers using synthetic data only. Do not enter real customer names, addresses, phone numbers, notes, transactions, or other regulated-retail records.

## Join and install

1. On the Android phone, sign in to Google Play with an address included in the **Friends** internal-test list.
2. Open the [DRX internal-test opt-in page](https://play.google.com/apps/internaltest/4701275532742360674).
3. Accept the invitation, then choose **Download it on Google Play**.
4. Install or update **DRX**. Google Play may temporarily show the historical listing name **Deelrx CRM**.
5. Open the app from the Play Store. This is a standalone release build; Expo Go and a development computer are not required.
6. Record the app version and build number shown on the device before testing. If the expected build is not available yet, stop and report the version shown rather than testing an older build.

## Synthetic test setup

- Use an approved synthetic operator account and a synthetic Washington business/location.
- Use unmistakably synthetic customers such as `Test Customer 01` and `test+android01@example.invalid`.
- Use synthetic catalog items, inventory quantities, addresses, and dollar amounts.
- Never attach screenshots containing credentials, tokens, personal data, or live business records.

## Required checks

1. Sign in and complete the owner-name and shop-name setup if the synthetic account is new, then confirm the workspace opens.
2. Open **More** and confirm the expected business and role are shown.
3. Add a synthetic inventory item and confirm its quantity and price persist after relaunch.
4. Add a synthetic customer, relaunch, and confirm the customer remains in the list with the expected available credit.
5. Complete one online cash sale and one online credit sale; verify totals, inventory movement, available credit, and sales history.
6. Put the phone offline, complete an authorized cash sale, relaunch the app, reconnect, and verify the queued sale synchronizes exactly once.
7. If the account is authorized for offline credit, repeat the offline test within its configured limits and verify the balance reconciles exactly once.
8. Open Deliveries, grant notification permission when prompted, and verify synthetic delivery reminders reveal no customer data on the lock screen.
9. Sign out, relaunch, and confirm the prior tenant's cached customer and transaction data are not visible.
10. Sign in with a second synthetic tenant and confirm no data from the first tenant appears.
11. Open **Help & Support** and record whether both the documentation and email actions work.

## Required mobile-web pass

Every Android tester must also open `https://deelrxcrm.app` in Chrome or their primary phone browser and complete the mobile-web section of the Mobile Test Companion at `https://deelrxcrm.com/resources/mobile-testing`:

1. Sign in to the same synthetic tenant and confirm the expected business and screens.
2. Find the preloaded synthetic browser product and customer supplied in the test notes.
3. Complete a synthetic cash sale on mobile web and confirm it appears exactly once in browser Sales.
4. Check navigation, forms, keyboard behavior, scrolling, and portrait layout.
5. Sign out, reload, and verify a second synthetic tenant cannot see first-tenant data.
6. Open Resources, Privacy, and Terms and report any broken destination.

The test is incomplete until both the native Android and mobile-web sections have outcomes.

## Evidence to return

For each device, report:

- phone manufacturer/model and Android version;
- DRX app version and Android build number;
- tester Google account only as a redacted identifier, for example `l***@example.com`;
- pass/fail for each required check;
- mobile browser name and pass/fail for every required mobile-web check;
- time and timezone of the run;
- sanitized screenshots of failures only; and
- exact reproduction steps, expected result, and observed result.

Report blockers through the approved DRX support channel. The verified public support destination is [Resources](https://deelrxcrm.com/resources); the public privacy and terms pages are [Privacy Policy](https://deelrxcrm.com/legal/privacy) and [Terms of Service](https://deelrxcrm.com/legal/terms).
