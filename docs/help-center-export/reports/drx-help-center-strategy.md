# DRX Help Center Strategy

Generated: 2026-04-03

## 1) Category structure (production)

1. Getting Started
2. Dashboard
3. Quick POS
4. Sales
5. Inventory
6. Customers
7. Front / Balances
8. Reports
9. Roles and Permissions
10. Privacy and Security
11. Settings
12. Billing
13. Troubleshooting
14. DRX Intelligence
15. Admin Tools

## 2) Content style rules

- Route-accurate: mention real nav labels and real route behavior.
- Task-first: start with what the user is trying to get done.
- Keep it short and practical: no filler intros.
- Include recovery: “what to check first” for bad states.
- Prefer direct verbs: set up, check, track, edit, fix, move.
- Never claim hidden/scaffold-only behavior as available to all users.

## 3) DRX voice rules

- Casual, sharp, and clear.
- Helpful without sounding robotic.
- Modern and direct, no compliance-speak.
- Example tone:
  - “Use this when you need to close a sale fast.”
  - “If counts look off, check sales, manual edits, and intake history first.”
- Avoid buzzword language:
  - leverage, robust, seamless, enterprise-grade, optimize.

## 4) Article template standard

Every final article should include:

1. Title
2. Short summary
3. What this does
4. Who can use it
5. Before you start
6. Step-by-step
7. What happens next
8. Tips
9. Common mistakes
10. Troubleshooting
11. Related articles

## 5) Changelog formatting standard

- Audience: customers/operators.
- Format by date + version.
- Include:
  - what changed,
  - why it matters,
  - what to do (if anything).
- Keep internal implementation details out.
- Group updates under:
  - New
  - Improved
  - Fixed

## 6) Roadmap formatting standard

- Use sections:
  - Now
  - Next
  - Later
- Label every item with one status:
  - planned
  - in progress
  - under review
- Avoid hard dates unless committed.
- No fantasy features; roadmap items must trace to real product direction in code/recent history.

## 7) Maintenance workflow (recommended)

1. Run release-ready feature audit against changed routes/APIs/permissions.
2. Generate docs diff report:
   - changed features
   - impacted articles
   - new required articles.
3. Update final markdown in `docs/help-center-export/final/`.
4. Run dry-run publish script and review slug map.
5. Publish to Featurebase with live mode.
6. Record results in `publish-results.md`.
7. Spot-check in-app `/help` and embedded Featurebase views.
