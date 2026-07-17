# Real beta end-to-end gate

The real beta Playwright suite proves the protected operator workflow against real authentication and persistent backend data. It is intentionally excluded from ordinary `test:e2e` runs unless explicitly enabled; mocked or auth-bypassed suites do not replace this gate.

## Safety model

- Ordinary Playwright runs ignore `beta-real-workflow.spec.ts` when `BETA_E2E_ENABLED` is not enabled.
- `pnpm test:e2e:beta` sets `BETA_E2E_REQUIRED=1` and fails before test discovery when the gate is not explicitly enabled.
- When enabled, the suite fails during configuration if required credentials are missing or an authentication bypass is active.
- Use a dedicated beta database and test tenant. The suite creates a customer and completes a sale, so it mutates persistent data.

## Required configuration

Set these through the approved secret manager or a local untracked environment file:

- `BETA_E2E_ENABLED=true`
- `CLERK_TESTING_TOKEN`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DRX_PII_KEY_CURRENT_B64`
- `DRX_PII_HASH_KEY_B64`

Optional overrides:

- `BETA_E2E_PRODUCT_SKU`; defaults to `DRX-BETA-E2E-001`
- `BETA_E2E_CUSTOMER_PHONE`; defaults to `5550199001`

Both `BYPASS_AUTH_FOR_TESTING` and `NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING` must remain false.

## Runbook

1. Confirm the target environment is the dedicated beta environment.
2. Provision the dedicated test tenant and a product matching `BETA_E2E_PRODUCT_SKU` (or its default, `DRX-BETA-E2E-001`) through the approved beta-environment workflow. Confirm the product has positive inventory and FIFO lineage before running the suite.

3. Run the credentialed gate:

   ```bash
   pnpm test:e2e:beta
   ```

   The command runs only the desktop `chromium` project with retries disabled so this mutating workflow executes once per invocation.

4. Attach the commit SHA, environment, Playwright report, created sale ID, and sanitized persistence evidence to the relevant Linear `Live E2E` issue.

The gate is complete only when the sale, FIFO inventory change, and reconciliation result persist and can be read from a second authenticated session or equivalent independent verification.
