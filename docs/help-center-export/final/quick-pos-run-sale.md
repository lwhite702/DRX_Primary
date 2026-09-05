# Quick POS: Run a Sale Fast

Quick POS is for getting in, making the sale, and keeping it moving.

## What this does

Walks through the operator flow from `Quick Sale` to payment completion.

## Who can use it

Staff, Manager, Owner (based on role permissions)

## Before you start

- Product catalog should be active.
- User needs POS access permission.

## Step-by-step

1. Open `Quick Sale`.
2. Add items by search or saved aliases.
3. Confirm quantities and remove mistakes before payment.
4. Continue to `Payment` and review the verified subtotal, loyalty discount, and tax.
5. Select the payment method and confirm the displayed total.
6. Finish on `Complete` and return for the next sale.

## What happens next

The sale posts to history and downstream reporting.

## Tips

- Keep aliases clean for top items.
- Fix quantity before payment to avoid extra correction work.

## Common mistakes

- Ringing with stale product info.
- Skipping the verified final total check in rush periods.

## Troubleshooting

- If item lookup is slow, simplify search terms or use aliases.
- If payment fails to post, keep the cart open and retry; Quick Sale reuses the same sale key so an already-committed sale resolves without duplicating inventory or totals.

## Related articles

- `sales-history-receipts.md`
- `settings-and-aliases.md`
- `troubleshooting-fast-fixes.md`
