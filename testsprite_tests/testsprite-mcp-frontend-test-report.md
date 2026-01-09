# TestSprite AI Frontend Testing Report (MCP)

**Project Name:** drx-v2
**Date:** 2026-01-07
**Status:** ❌ Failed (3/13 Passed)

## Executive Summary

Frontend testing revealed significant issues, including potential critical security vulnerabilities and missing database functions. While basic UI navigation works, advanced logic (POS fractional quantities, credit search) and security features (route protection, invalid login handling) are failing.

## Critical Issues Noted

### 🚨 Security: Invalid Login Success

- **Test:** `TC002_Login_failure_with_invalid_credentials`
- **Finding:** The test reported that login with _invalid_ credentials succeeded unexpectedly.
- **Impact:** Critical. This must be verified manually immediately. It might be a test artifact (misinterpreting a loading state as success) or a real bypass.

### 🚨 Security: Route Protection Failure

- **Test:** `TC001_Login_success_with_valid_credentials`
- **Finding:** Authenticated user was able to access `/admin` despite role restrictions.
- **Impact:** High. User roles are not being enforced correctly on the client-side routing.

### ⚠️ Infrastructure: Missing RPC Function

- **Error:** `404 Not Found` for `rpc/get_user_permissions`
- **Impact:** Widespread. This error appears in almost all failed tests. The application attempts to call a Supabase RPC function that does not exist, causing permission checks and other logic to fail or fallback unpredictably.

### ⚠️ Functional: POS Limitations

- **Test:** `TC004_POS_transaction_with_fractional_quantities_and_tax_calculation`
- **Finding:** UI does not support fractional quantities (e.g. 1.5 units).

## Test Results Detail

### Passed Tests (3/13)

- ✅ `TC003`: Role-based permission enforcement on POS actions.
- ✅ `TC008`: Mobile POS usability and performance.
- ✅ `TC012`: Server-side enforced route protection (Note: This contrasts with TC001 failure, suggesting server-side might be fine but client-side is leaky, or test definitions differ).

### Failed Tests (10/13)

- ❌ `TC001`: Route protection failed.
- ❌ `TC002`: Invalid login succeeded (CRITICAL).
- ❌ `TC004`: Fractional quantities not supported.
- ❌ `TC005`: Inventory intake UI interaction failed.
- ❌ `TC006`: Add Customer form submission failed.
- ❌ `TC007`: Unexpected logout/session loss.
- ❌ `TC009`: Unexpected logout/session loss.
- ❌ `TC010`: Credit search button opens notifications instead.
- ❌ `TC011`: Unexpected logout/session loss.
- ❌ `TC013`: Session expiration accessing Reports.

## Recommendations

1.  **Investigate `get_user_permissions`**: This RPC function is missing from the Supabase database. It needs to be created.
2.  **Verify Login Security**: Manually confirm if invalid credentials actually allow access.
3.  **Fix Client-Side Routing**: Ensure `use-user-role.ts` or middleware correctly handles /admin protection.
4.  **Stability**: Session loss seems frequent (`TC007`, `TC009`, `TC011`, `TC013`). Investigate auth persistence or timeout settings.
