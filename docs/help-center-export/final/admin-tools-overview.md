# Admin Tools Overview

Admin routes are for high-impact controls: feature gating, approvals, and system-level visibility.

## What this does

Summarizes the admin area and when to use each section.

## Who can use it

Admin-authorized users only

## Before you start

- Confirm you have explicit admin route access.

## Step-by-step

1. Open `Admin` dashboard.
2. Use `Admin > Users` for access-level interventions.
3. Use `Admin > Features` for feature gate review.
4. Use `Admin > Approvals` for controlled actions.
5. Use audit/admin analytics surfaces to trace sensitive changes.

## What happens next

Admin actions affect broad user behavior. Keep logs and change rationale tight.

## Tips

- Treat admin changes like production changes: small, traceable, reversible where possible.

## Common mistakes

- Rolling out feature toggles without a validation pass on target roles.

## Troubleshooting

- If a feature appears missing for users, inspect feature gate + role + tenant context.

## Related articles

- `roles-permissions-staff-access.md`
- `privacy-security-rtbf.md`
- `drx-intelligence.md`
