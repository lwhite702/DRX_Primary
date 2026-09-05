# WRE-89: Fractional product setup

Status: 0.7.0 web/backend deployed with user approval on 2026-08-31; authenticated cross-client/device acceptance and native distribution remain pending. The subsequent product-dialog repair is verified locally and 0.7.1 is prepared with explicit deployment approval; publication evidence is pending. Original release impact: minor; roadmap impact: add. Dialog repair release impact: patch; roadmap impact: none.

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

## Approved web/backend deployment — 2026-08-31

- PR [173](https://github.com/lwhite702/DRX_Primary/pull/173) merged as `6d5c8b70626cd592e9f2231ec390c2a61b39e1fd`. The deployed source commit `237bcead08fc9d747753728f8b0129f2d90ddad2` and merge commit have identical tree `0e5981ff40407b99e84f83bbf562bd0218e6fcf5`.
- Vercel deployment `dpl_8JjMA9kifxpSLgtefQ2bxBqhueGr` reached READY and was aliased to `www.deelrxcrm.app`, `deelrxcrm.app`, and `app.deelrxcrm.app`. Convex production `brainy-mouse-884` deployed with strict TypeScript/schema checks and no index deletions.
- The authenticated browser showed the fractional configuration fields and a healthy database health response. No real product or checkout was submitted during that inspection.
- GitHub Actions could not start because of its usage budget. The user approved proceeding without Actions; local gates passed, and no branch protection or authorization control was disabled.
- This is web/backend deployment evidence, not full release acceptance. No tag, Featurebase publication, store submission, or signed-device acceptance was established.

## Product-dialog follow-up — 2026-08-31

- Branch `codex/WRE-89-product-dialog-polish`, based on the merge above. Scope is only the creation/edit caption, inventory-dialog viewport containment, and the required 0.7.1 product metadata; pricing, persistence, permissions, schemas, native behavior and native build identifiers are unchanged.
- Cause: creation pre-fills a SKU in a truthy draft object without a persisted ID; the dialog incorrectly treated the object as an existing product. It now checks `editingItem.id`, consistent with the form/save flow.
- A synthetic local browser fixture using the real page, hook, form, dialog and CSS reproduced the expanded dialog at 1,428 pixels high in a 1280×720 viewport. Close was above the viewport and Cancel below it. The fix limits the dialog to 688 pixels (16-pixel top/bottom margins) and scrolls only the form, retaining the header and Close control. Browser Cancel, Close and Escape all dismissed successfully after expansion. No backend writes were made; the temporary fixture was removed.
- Seven new tests cover generated-SKU creation, guided first-product creation, persisted-product editing, scroll containment, and all three dismissal paths without setup-link reopening. The focused run passed 12 tests across three files, including existing fractional-form and inventory-adapter tests. The initial red run reproduced the wrong title; the layout contract also failed before the fix.
- The user approved 0.7.1 production deployment on 2026-09-01. Publication must still be read back against the exact merge SHA. Keep WRE-89 In Review until its remaining runtime, tenant-isolation and native acceptance gates are verified.
