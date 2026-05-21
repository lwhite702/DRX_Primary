# @wrelik-kit Usage Guide

This document defines how to use `@wrelik/*` packages in the DRX monorepo.

## Overview

All external services must be accessed through `@wrelik/*` packages. Direct vendor SDK imports are banned in application code.

## Package Reference

| Package | Vendor | Purpose | Exports |
|---------|--------|---------|---------|
| `@wrelik/analytics` | PostHog | Analytics, Feature Flags | `./server`, `./client`, `./react-native` |
| `@wrelik/auth` | Clerk | Authentication | `./server`, `./client`, `./shared` |
| `@wrelik/db` | Neon/Prisma | Database Access | `.` |
| `@wrelik/email` | Resend | Email Delivery | `.` |
| `@wrelik/errors` | Sentry | Error Tracking | `./server`, `./client`, `./react-native` |
| `@wrelik/jobs` | Inngest | Background Jobs | `.` |
| `@wrelik/storage` | Cloudflare R2 | File Storage | `.` |
| `@wrelik/config` | Doppler | Configuration | `.` |

## Usage Examples

### Analytics (`@wrelik/analytics`)

#### Client-Side (Browser)

```typescript
import {
  initAnalytics,
  identify,
  capture,
  capturePageView,
  isFeatureEnabled,
  getFeatureFlag,
} from "@wrelik/analytics/client";

// Initialize (usually in root provider)
initAnalytics({
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  capturePageview: false,
  autocapture: true,
});

// Identify user
identify(userId, {
  email: user.email,
  name: user.name,
  orgId: user.orgId,
});

// Track events
capture("app.checkout.completed", {
  orderId: order.id,
  total: order.total,
});

// Feature flags
if (isFeatureEnabled("beta.pos.quick-checkout")) {
  // Show new feature
}
```

#### Server-Side (Node.js)

```typescript
import {
  initAnalytics,
  capture,
  identify,
  shutdown,
} from "@wrelik/analytics/server";

// Initialize once at app startup
initAnalytics(
  process.env.POSTHOG_API_KEY!,
  process.env.POSTHOG_HOST
);

// Track server-side events
capture("app.api.checkout", { orderId }, { userId });

// Cleanup on shutdown
await shutdown();
```

### Error Tracking (`@wrelik/errors`)

#### Client-Side (Browser)

```typescript
import {
  initErrors,
  captureError,
  setUserContext,
  addBreadcrumb,
} from "@wrelik/errors/client";

// Initialize
initErrors({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Set user context
setUserContext({ id: userId, email: user.email });

// Track errors
try {
  await riskyOperation();
} catch (err) {
  captureError(err, { context: "checkout" });
}

// Add breadcrumbs
addBreadcrumb("User clicked checkout", "user", { cartItems: 5 });
```

#### Server-Side (Node.js)

```typescript
import {
  initErrors,
  captureError,
  setUserContext,
} from "@wrelik/errors/server";

// Initialize once at app startup
initErrors({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});

// In request handlers
setUserContext({ id: userId });
captureError(error, { route: "/api/checkout" });
```

### Authentication (`@wrelik/auth`)

#### Server-Side (Next.js API Routes)

```typescript
import { getWorkflowSession } from "@/lib/adapters/auth/server";

export async function GET() {
  const session = await getWorkflowSession();
  
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Access user data
  const { userId, tenantId, roles } = session;
}
```

#### Client-Side (React Components)

```typescript
import { useAuth, useUser } from "@/lib/adapters/auth/ui";

function ProfileCard() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  
  if (!isSignedIn) return <SignInPrompt />;
  
  return <div>Welcome, {user?.fullName}</div>;
}
```

### Database (`@wrelik/db`)

```typescript
import { db } from "@/lib/db";

// Query with tenant scoping
const products = await db.inventory.findMany({
  where: { businessId: session.tenantId },
  orderBy: { name: "asc" },
});

// Create with tenant context
const sale = await db.sales.create({
  data: {
    businessId: session.tenantId,
    customerId: customer.id,
    total: cart.total,
  },
});
```

## Banned Imports

The following direct imports are **banned** in application code:

```typescript
// ❌ BANNED - Direct vendor imports
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { ClerkProvider } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

// ✅ ALLOWED - Through wrelik adapters
import { capture } from "@wrelik/analytics/client";
import { captureError } from "@wrelik/errors/client";
import { ClerkProvider } from "@/lib/adapters/auth/ui";
import { db } from "@/lib/db";
```

## Exceptions

Direct vendor imports are allowed **only** in:

1. Adapter implementation files (`lib/adapters/**`)
2. Test files (`*.test.*`, `*.spec.*`)
3. Configuration files (`sentry.*.config.ts`, etc.) - **should be migrated**

## ESLint Enforcement

The monorepo enforces these rules via ESLint `no-restricted-imports`:

```javascript
// tooling/eslint/base.mjs
{
  "no-restricted-imports": ["error", {
    "patterns": [
      "posthog-js",
      "@sentry/*",
      "@clerk/*",
      "@supabase/*",
    ]
  }]
}
```

## Migration Guide

If you have existing code using direct vendor imports:

1. Identify the direct import
2. Find the corresponding `@wrelik/*` package
3. Replace with adapter import
4. Test that functionality remains

Example migration:

```diff
- import posthog from "posthog-js";
+ import { capture, identify } from "@wrelik/analytics/client";

- posthog.capture("checkout", { total });
+ capture("app.pos.checkout", { total });

- posthog.identify(userId, { email });
+ identify(userId, { email });
```

## Version Policy

Wrelik packages are pinned via `pnpm.overrides` in root `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "@wrelik/analytics": "2.0.0",
      "@wrelik/auth": "2.0.0",
      "@wrelik/errors": "2.0.0"
    }
  }
}
```

Update versions in a single PR with full regression testing.

## Related Documentation

- [Stack Policy](../STACK_POLICY.md)
- [Vendor Policy](decisions/0000-vendor-policy.md)
- [Feature Flags](feature-flags.md)
- [Wrelik Kit Integration](WRELIK_KIT_INTEGRATION.md)
