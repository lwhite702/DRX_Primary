# Feature Flags Guide

This document defines the feature flag system for DRX.

## Overview

DRX uses PostHog feature flags via `@wrelik/analytics` for:
- Feature rollout control
- Beta access gating
- A/B testing experiments
- Kill switches and maintenance mode

## Flag Types

| Type | Prefix | Purpose | Example |
|------|--------|---------|---------|
| Release | `release.*` | Gradual feature rollout | `release.pos.quick-checkout` |
| Beta | `beta.*` | Beta user access gating | `beta.ai.product-intelligence` |
| Experiment | `exp.*` | A/B testing | `exp.onboarding.wizard-v2` |
| Ops | `ops.*` | Kill switches, maintenance | `ops.maintenance.scheduled` |
| UI | `ui.*` | UI variant control | `ui.dashboard.new-layout` |

## Naming Convention

```
{type}.{domain}.{feature}
```

### Examples

```
release.pos.delivery-tracking
beta.ai.credit-recommendations
exp.checkout.one-click-pay
ops.api.rate-limit-strict
ui.sidebar.collapsed-default
```

## Usage

### Client-Side (React Hooks)

```typescript
import { useFeatureFlag, useFeatureFlagValue } from "@/lib/hooks/use-feature-flag";

function CheckoutPage() {
  // Boolean flag
  const { isEnabled, loading } = useFeatureFlag("release.pos.quick-checkout");
  
  if (loading) return <Spinner />;
  
  return isEnabled ? <QuickCheckout /> : <StandardCheckout />;
}

function OnboardingFlow() {
  // Multivariate flag
  const { value, loading } = useFeatureFlagValue("exp.onboarding.wizard-version");
  
  if (value === "v2") return <WizardV2 />;
  return <WizardV1 />;
}
```

### Direct API (Provider Exports)

```typescript
import {
  isFeatureEnabled,
  getFeatureFlag,
  onFeatureFlags,
} from "@/components/providers/posthog-provider";

// Check flag synchronously (after flags loaded)
if (isFeatureEnabled("beta.ai.recommendations")) {
  showRecommendations();
}

// Get multivariate value
const variant = getFeatureFlag("exp.checkout.layout");

// React to flag changes
onFeatureFlags(() => {
  console.log("Flags updated");
});
```

### Server-Side

```typescript
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!);

async function getServerFlags(userId: string) {
  const flags = await posthog.getAllFlags(userId);
  return flags;
}

async function checkFlag(userId: string, flagKey: string) {
  const enabled = await posthog.isFeatureEnabled(flagKey, userId);
  return enabled;
}
```

## Creating Flags

### In PostHog Dashboard

1. Go to PostHog → Feature Flags
2. Click "New feature flag"
3. Set key following naming convention
4. Configure rollout conditions:
   - Percentage rollout
   - User property matching
   - Group targeting

### Flag Configuration Examples

#### Beta Access Flag
```json
{
  "key": "beta.ai.product-intelligence",
  "filters": {
    "groups": [
      {
        "properties": [
          {
            "key": "email",
            "type": "person",
            "value": ["@wrelik.com", "@beta-tester.com"],
            "operator": "icontains"
          }
        ],
        "rollout_percentage": 100
      }
    ]
  }
}
```

#### Gradual Rollout Flag
```json
{
  "key": "release.pos.delivery-tracking",
  "filters": {
    "groups": [
      {
        "rollout_percentage": 10
      }
    ]
  }
}
```

#### A/B Test Flag
```json
{
  "key": "exp.checkout.layout",
  "filters": {
    "multivariate": {
      "variants": [
        { "key": "control", "rollout_percentage": 50 },
        { "key": "variant-a", "rollout_percentage": 25 },
        { "key": "variant-b", "rollout_percentage": 25 }
      ]
    }
  }
}
```

## Best Practices

### 1. Always Provide Defaults

```typescript
// ✅ Good - has fallback
const enabled = isFeatureEnabled("release.new-feature", false);

// ❌ Bad - no fallback
const enabled = isFeatureEnabled("release.new-feature");
```

### 2. Handle Loading States

```typescript
const { isEnabled, loading } = useFeatureFlag("beta.feature");

// Show loading state
if (loading) return <Skeleton />;

// Don't flash wrong UI
return isEnabled ? <NewFeature /> : <OldFeature />;
```

### 3. Use Meaningful Keys

```typescript
// ✅ Good - clear purpose
"release.inventory.bulk-import"
"beta.ai.price-recommendations"

// ❌ Bad - vague or numbered
"feature-1"
"new-thing"
```

### 4. Clean Up Old Flags

After a feature is fully rolled out:
1. Remove flag checks from code
2. Archive flag in PostHog
3. Document in changelog

### 5. Test Both States

Always test with flag ON and OFF:

```typescript
describe("Feature with flag", () => {
  it("works when flag is enabled", async () => {
    mockFeatureFlag("release.feature", true);
    // test enabled behavior
  });
  
  it("works when flag is disabled", async () => {
    mockFeatureFlag("release.feature", false);
    // test disabled behavior
  });
});
```

## Flag Lifecycle

```
1. CREATED
   → Flag defined in PostHog
   → Code checks flag (default: off)

2. INTERNAL_TESTING
   → Enabled for @wrelik.com emails
   → QA validation

3. BETA_ROLLOUT
   → Enabled for beta users
   → Monitoring for issues

4. GRADUAL_ROLLOUT
   → 10% → 25% → 50% → 100%
   → Watch metrics at each stage

5. FULLY_LAUNCHED
   → 100% rollout
   → Flag check can be removed

6. ARCHIVED
   → Flag removed from code
   → Archived in PostHog
```

## Emergency Kill Switches

For critical issues, use `ops.*` flags:

```typescript
// API route
const maintenanceMode = await isFeatureEnabled("ops.api.maintenance");
if (maintenanceMode) {
  return Response.json(
    { error: "Service temporarily unavailable" },
    { status: 503 }
  );
}
```

Kill switch flags should:
- Default to OFF (feature works)
- Be checkable without network
- Have monitoring/alerts

## Related Documentation

- [@wrelik-kit Usage](@wrelik-kit-usage.md)
- [Beta Rollout Plan](testing/BETA_ROLLOUT_PLAN.md)
- [Stack Policy](../STACK_POLICY.md)
