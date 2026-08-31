# WRE-89: Fractional product setup

Status: implementation verified locally; 0.7.0 prepared for user-approved web/backend deployment. Deployment is pending; no store distribution or native build counter changes. Release impact: minor. Roadmap impact: add.

## Operator workflow

1. During onboarding, choose **Add Your First Product**, or open **Inventory → Add Product**.
2. Enter the product identity and price/cost for one full selling unit.
3. In **How this product is sold**, enable **Allow fractional sales** only for products sold in portions. Choose the unit, decimal places, minimum sale quantity, and quantity increment.
4. Optionally enter up to eight comma-separated dollar and quantity presets. With a 0.5 minimum and 0.25 increment, valid quantities include 0.5, 0.75, and 1. Dollar entry suggests the nearest permitted quantity; operators must review the resulting actual total.
5. Save the product, then receive stock through inventory intake. Web's legacy starting-stock field accepts whole numbers only; fractional stock belongs in intake. iOS starts at zero stock. Android's optional starting quantity is recorded with its unit cost in an atomic FIFO batch; later stock uses intake.
6. Bulk tiers and later rule edits remain in **Settings → Commerce & Delivery**. Android's older bulk calculator is explicitly a preview, not a saved pricing rule.

Whole-unit selling is the default in the new forms. Existing products and older API callers retain their previous behavior. Editing an existing web product does not reset its selling rules.

## Data and release boundaries

- Web preserves the transitional Prisma inventory/settings contract. Product, rules and creation audit share one serializable transaction; invalid settings or write failures cannot produce a successful partial create.
- iOS and Expo use the authenticated tenant-scoped Convex `products:createProduct` mutation. The optional new configuration is backward compatible; the mutation validates before any insert and commits its audit atomically.
- No automatic product matching, legacy product migration, business relinking, or dual-database write was added. Web/native product identity mapping remains the existing explicit commerce-settings workflow. Do not claim that creating a web product automatically creates its native counterpart.
- Required acceptance still includes real authenticated save/reload/checkout, two-tenant isolation, a deployed Convex contract before updated native clients, and signed device/store verification. Automated tests and an unsigned simulator build are narrower evidence.

Tracking: https://linear.app/wrelik/issue/WRE-89

## Local verification — 2026-08-31

- Worktree branch: `codex/WRE-89-fractional-product-onboarding`, based on `d1ccc93e1ae18c616b3982036f79aa7122f43ca8`. Implementation commit: `98c3bde415091b5ff2e4b7a323b39bd97cb6bb62`. Product metadata was subsequently prepared as 0.7.0 after deployment approval; iOS build remains 43. No release cut or tag.
- Web/backend unit tests: 101 files, 617 tests passed. Integration tests: 16 files, 85 tests passed. These use synthetic fixtures, not production checkout evidence.
- Web and Expo TypeScript checks passed. Targeted web lint passed; Expo lint has one existing unused `handleAddTier` warning, no errors.
- Next.js production build passed. Generated service-worker changes were restored and are not part of this change.
- Unsigned arm64 iOS simulator build passed; `CheckoutMathTests` passed all 17 tests, including three new product-configuration tests. The generic simulator build's x86_64 dependency link failure does not affect the verified arm64 destination; signed devices are still unverified.
- Android Metro/Hermes export passed after installing isolated worktree dependencies with the frozen lockfile. The initial shared dependency symlinks were removed; no dependency versions changed. This is bundle evidence, not a signed Android build or device test.
- `pnpm release:integrity` passed, including version, changelog, behavioral, release-evidence, and read-only Featurebase fixtures. Official product requirements were updated and read back. No Featurebase publication, production mutation, push, tag, or store submission occurred.
