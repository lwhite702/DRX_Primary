# DRX iOS internal testing

Issue: WRE-49

This runbook is for authorized TestFlight testers using synthetic data only. Do not enter real customer names, addresses, phone numbers, notes, transactions, or other regulated-retail records.

## Join and install

1. Install Apple's TestFlight app on the iPhone or iPad.
2. Open the DRX invitation supplied by the release coordinator using the invited Apple Account.
3. Install or update DRX in TestFlight.
4. Record the DRX version and build number shown in TestFlight before testing.
5. Open the public `/resources/mobile-testing` companion page on the same device, select **iPhone or iPad**, and complete the form as you test.

## Synthetic test setup

- Use an approved synthetic operator account and synthetic business/location.
- Use unmistakably synthetic customers such as `Test Customer 01` and `test+ios01@example.invalid`.
- Use synthetic catalog items, inventory quantities, delivery addresses, and dollar amounts.
- Never attach screenshots containing credentials, tokens, personal data, or live business records.

## Required native checks

1. Sign in and complete onboarding/business setup if the synthetic account is new.
2. Confirm the expected business and role are shown after setup.
3. Add a synthetic inventory item, open it, record a starting intake, and confirm its quantity and price persist after relaunch.
4. Add a synthetic customer and confirm the customer remains in the list with the expected available credit.
5. Complete online cash and credit sales; verify totals, inventory, available credit, and sales history.
6. Assign a synthetic delivery to yourself, mark Uber ordered with a 2-minute wait, and verify the reminder reveals no customer information on the lock screen.
7. Sign out and relaunch; confirm the prior tenant's cached data is absent.
8. Sign in with a second synthetic tenant and confirm no first-tenant data appears.
9. Open Help & Support and record whether its actions work.

## Required mobile-web pass

Every iOS tester must also open `https://deelrxcrm.app` in Safari or their primary phone browser and complete the companion's mobile-web section:

1. Sign in to the same synthetic tenant and confirm the expected business and screens.
2. Find the preloaded synthetic browser product and customer supplied in the test notes.
3. Complete a synthetic cash sale on mobile web and confirm it appears exactly once in browser Sales.
4. Check navigation, forms, keyboard behavior, scrolling, and portrait layout.
5. Sign out, reload, and verify a second synthetic tenant cannot see first-tenant data.
6. Open Resources, Privacy, and Terms and report any broken destination.

The test is incomplete until both the native iOS and mobile-web sections have outcomes.

## Evidence to return

- iPhone/iPad model and iOS version;
- DRX version and TestFlight build number;
- tester identity as a redacted alias only;
- mobile browser used;
- outcome and sanitized notes for every native and mobile-web check;
- time and timezone of the run; and
- sanitized screenshots and reproduction steps for failures only.
