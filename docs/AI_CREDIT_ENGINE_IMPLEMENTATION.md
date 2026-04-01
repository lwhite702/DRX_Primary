# AI Credit Limit Engine - Complete Implementation Guide

## Overview

The AI Credit Limit Engine is a fully integrated system that uses machine learning to automatically recommend safe, dynamic credit limits for each customer. The system is explainable, overrideable, and maintains a complete audit trail.

## Architecture

### 1. Feature Engineering (`lib/credit/aiEngine/features.ts`)

Computes a comprehensive feature bundle for each customer:

- **Sales Metrics**: 30-day, 90-day, and all-time sales totals
- **Credit Behavior**: Historical credit issued, repaid, and payment timeliness
- **Repayment Health**: On-time ratio, late payment count, days since first transaction
- **Inventory Health**: Total inventory value, turnover rates, restock costs
- **Customer Profile**: Purchase frequency, average ticket size, tenure

**Key Functions:**
- `computeCustomerFeatures()` - Main entry point to gather all features
- `normalizeFeatures()` - Scales and normalizes features for AI input

### 2. AI Limit Engine (`lib/credit/aiEngine/limitEngine.ts`)

Generates AI-powered credit limit recommendations with hard safety guardrails:

**Process:**
1. Normalizes customer features (0-100 scales)
2. Calls OpenAI API with structured prompt
3. Validates response against business constraints
4. Falls back to rule-based system if AI unavailable
5. Returns final recommendation with risk score and justification

**Hard Caps:**
- Global maximum per customer
- Inventory-based exposure ratio (default: 50% of inventory value)
- Soft caps for customers with poor repayment history

**Key Functions:**
- `computeAICreditLimit()` - Main recommendation engine
- `callAILimitEngine()` - OpenAI integration
- `applyRuleBasedFallback()` - Fallback logic when AI unavailable

### 3. Credit Decision Service (`lib/credit/creditDecisionService.ts`)

Manages AI recommendations and manual overrides with complete audit trail:

**Operations:**
- `refreshAICreditRecommendation()` - Compute and store AI recommendation
- `applyAICreditRecommendation()` - Apply AI-suggested limit
- `overrideCreditLimit()` - Manual override with audit trail
- `logCreditDecision()` - Log all limit changes
- `getCreditDecisionHistory()` - Retrieve decision audit trail
- `getCreditExposureReport()` - Aggregate credit metrics

### 4. Credit Scheduler (`lib/credit/creditScheduler.ts`)

Background scheduler for periodic AI recalculation:

**Functions:**
- `scheduleNightlyRefresh()` - Batch process all customers (called by cron)
- `refreshAllCustomerLimits()` - Refresh limits for customers due for review
- `manualRefreshCustomerLimit()` - On-demand refresh for single customer

## Database Schema

### New Fields in `customers` Table

```sql
credit_limit              -- Final approved limit
credit_limit_ai_recommended -- AI suggested limit
credit_limit_last_reviewed_at -- Last AI review timestamp
credit_risk_score         -- 0-100 risk assessment
credit_notes              -- Manual notes about credit
```

### New Tables

**`ai_credit_decisions`** - Audit trail of all credit decisions
- decision_type: 'ai_recommendation', 'manual_override', 'auto_apply'
- old_limit, new_limit, risk_score
- reason, details_json
- decided_by (user_id or null for system)
- created_at

### New Business Settings

```sql
ai_credit_engine_enabled              -- Boolean to enable/disable
global_max_credit_per_customer        -- Hard cap (default: $10,000)
global_max_credit_ratio_of_inventory  -- Ratio cap (default: 0.5)
default_credit_limit_for_new_customer -- New customer default (default: $1,000)
ai_credit_auto_refresh_days          -- Days between refreshes (default: 7)
```

### Materialized View `v_credit_analytics`

Pre-computed analytics view for efficient feature calculation:
- Sales metrics (30d, 90d, all-time)
- Credit metrics (issued, repaid, balance)
- Customer tenure and transaction counts
- Repayment history

## API Routes

### POST `/api/credit/refresh-limits`

Scheduled endpoint for nightly refresh of all customer limits.

**Auth:** Requires `Authorization: Bearer {CRON_SECRET}`

**Response:**
```json
{
  "message": "Credit limit refresh completed successfully"
}
```

### POST `/api/credit/refresh-customer`

On-demand refresh for a single customer's AI recommendation.

**Body:**
```json
{
  "customer_id": "uuid",
  "business_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": {
    "recommended_limit": 5000,
    "risk_score": 45,
    "justification": "Strong sales performance...",
    "range_min": 4000,
    "range_max": 6500
  }
}
```

### POST `/api/credit/apply-recommendation`

Apply AI recommendation or manual override.

**Body:**
```json
{
  "customer_id": "uuid",
  "business_id": "uuid",
  "user_id": "uuid",
  "action": "apply_ai_recommendation" | "override",
  "new_limit": 5000,
  "reason": "Manual override reason (required for override)"
}
```

### GET `/api/credit/exposure-report`

Get credit exposure metrics for business.

**Query Parameters:**
- `business_id` (required)

**Response:**
```json
{
  "total_credit_limits": 50000,
  "total_credit_balance": 25000,
  "utilization_ratio": 0.5,
  "at_risk_customers": 3,
  "customers_reviewed_today": 5
}
```

## UI Components

### AICreditPanel (`components/credit/AICreditPanel.tsx`)

Main credit recommendation interface displayed in customer detail pages.

**Features:**
- Display current credit limit and AI recommendation
- Show risk score with color coding
- Offer actions: Refresh, Apply, Override
- Display suggested range
- Show warnings if limit changes recommended
- Requires reason for manual overrides

**Props:**
- `customer_id`: Customer UUID
- `business_id`: Business UUID
- `current_limit`: Current approved limit
- `ai_recommended_limit`: AI suggestion
- `risk_score`: AI risk score (0-100)
- `can_apply`: Permission to apply changes
- `user_id`: Current user ID

### Customer Detail Page (`app/customers/[id]/page.tsx`)

Full customer profile with integrated AI credit panel:

**Displays:**
- Customer contact information
- Sales metrics (30d, 90d, lifetime)
- Credit metrics (balance, on-time ratio, late payments)
- Credit notes
- AI Credit Panel sidebar

## Feature Engineering Deep Dive

### Score Calculation

1. **Recency Score (0-100)**
   - Based on days since last transaction
   - Recent activity (≤30 days) = high score
   - Older activity (>365 days) = low score

2. **Frequency Score (0-100)**
   - Transactions per week normalized to 0-100
   - 10+ per week = 100, 0 = 0

3. **Monetary Score (0-100)**
   - Average ticket size normalized to 0-100
   - $5000+ = 100, $0 = 0

4. **Inventory Coverage Ratio (0-1)**
   - Total inventory value / monthly sales volume
   - Higher ratio = more cushion for credit

5. **Inventory Turnover (0-100)**
   - Based on items below reorder level
   - Higher = faster moving inventory, more credit safe

### Fallback Scoring Rules

When AI is unavailable:

- **New Customers** (< 30 days): Start at 30% of default
- **Early Stage** (30-90 days): Start at 150% of default  
- **Established** (> 90 days): 
  - Perfect repayment: +20% to current
  - Good repayment (80%+): maintain current
  - Poor repayment: -30% from current
  - Any late payment: no increase

## Risk Scoring

Final risk score (0-100):

- **0-25: Low Risk** - High frequency, excellent repayment, good inventory
- **25-50: Medium Risk** - Regular activity, generally good history
- **50-75: High Risk** - Irregular activity, some late payments
- **75-100: Critical Risk** - Poor repayment, irregular activity

## Integration with POS

The POS system enforces AI credit limits during checkout:

### POS Credit Validation

```typescript
const validation = await posEngine.validateCreditLimit(business_id);

if (!validation.valid) {
  // Hard block: exceeds credit_limit
  // Show error message
} else if (validation.warning) {
  // Soft warning: exceeds ai_limit but within hard limit
  // Require manager override to continue
}
```

**Warnings Include:**
- Transaction would exceed AI recommended limit
- Requires manager approval to proceed
- Still allows completion with override

## Audit Trail

Every credit limit change is logged with:

- **Decision Type**: AI recommendation, manual override, auto-apply
- **Old Limit & New Limit**: Dollar amounts
- **Risk Score**: At time of decision
- **Reason**: Short text explanation
- **User**: Who made the decision (null for system)
- **Timestamp**: When decision was made

**Access:**
```typescript
const history = await getCreditDecisionHistory(customer_id);
// Returns array of decisions with full context
```

## Configuration

Set in Business Settings:

```
AI Credit Engine Enabled: true
Global Max Credit Per Customer: $10,000
Inventory Ratio Cap: 0.5 (50%)
Default New Customer Limit: $1,000
Auto-Refresh Days: 7
```

Environment Variables:

```
OPENAI_API_KEY=sk-... # Required for AI recommendations
CRON_SECRET=... # Protect scheduled endpoint
```

## Safety Guarantees

1. **Hard Caps**: Never exceed configured maximums
2. **Inventory Awareness**: Cap credit to % of inventory value
3. **Conservative Default**: Fallback to 30% of cap for new customers
4. **Late Payment Safeguard**: Never increase for customers with late payments
5. **Audit Trail**: Every change logged and traceable
6. **Override Control**: All manual changes require reason and user tracking
7. **Graceful Failure**: AI failures don't block system, fallback to rules

## Testing Scenarios

### Scenario 1: New Customer, No History
- ✓ Features mostly empty
- ✓ AI recommends low limit near default
- ✓ No errors if data missing

### Scenario 2: High Volume, Perfect Repayment
- ✓ AI recommends higher limit within caps
- ✓ Risk score low (< 30)
- ✓ Strong justification referencing sales

### Scenario 3: Recent Late Payments
- ✓ AI recommends same or lower limit
- ✓ Risk score high (> 70)
- ✓ Warnings about late payments

### Scenario 4: Low Inventory, High Sales
- ✓ AI caps credit to inventory-based maximum
- ✓ Justification mentions inventory constraints
- ✓ Suggestions to increase inventory or reduce credit

### Scenario 5: AI Unavailable
- ✓ Falls back to rule-based calculation
- ✓ Uses customer history and defaults
- ✓ No system crashes or undefined values
- ✓ Clear indication in UI that it's fallback

## Monitoring & Alerting

Key metrics to monitor:

- **Utilization Ratio**: Sum of balances / sum of limits
- **At-Risk Customers**: Count with risk_score > 70
- **Drift**: Where overrides diverge > 30% from AI
- **Recalculation Success Rate**: % of scheduled refreshes that succeed

## Future Enhancements

1. Machine learning model training on historical data
2. Category-specific credit limits
3. Seasonal adjustments
4. Credit score integration (if available)
5. Predictive churn prevention
6. Automated limit reductions based on delinquency
7. Wholesale customer program with higher limits
8. Regional economic factors in recommendations

## Troubleshooting

### AI Recommendations Not Generating
1. Check `OPENAI_API_KEY` is set
2. Verify OpenAI account has sufficient credits
3. Check logs for API errors
4. System will fallback to rule-based automatically

### POS Blocking Valid Transactions
1. Check `credit_limit` vs `credit_limit_ai_recommended`
2. Verify customer's current balance
3. Review recent credit transactions
4. Check inventory cap setting

### Scheduler Not Running
1. Verify CRON_SECRET is set and matches request
2. Check cloud function logs
3. Ensure all permissions in place
4. Monitor POST to `/api/credit/refresh-limits`

### High Risk Scores Appearing Incorrect
1. Verify late_payment_count is accurate
2. Check sales and credit history is complete
3. Review on_time_repayment_ratio calculation
4. Check inventory metrics

---

**Implementation Status:** ✅ Complete

**AI-driven credit limit engine is implemented, auditable, and safely integrated with DRX credit, CRM, and POS workflows.**
