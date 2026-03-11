# DRX Intelligence System

DRX Intelligence is a rules-first decision engine for front (credit) operations.

## 1) Trust Score (0-100)

### Factors and weights

| Factor | Weight | Logic |
|---|---:|---|
| Payment history (on-time ratio) | 25% | Higher on-time ratio = higher score |
| Average repayment time | 15% | Faster repayment gets more points |
| Number of unpaid fronts | 15% | More unpaid fronts reduce score |
| Forgiven balances | 10% | More forgiveness events reduce score |
| Purchase frequency | 10% | Frequent buyers score higher |
| Customer lifetime | 10% | Longer relationship improves score |
| Average transaction size | 5% | Stable larger baskets increase confidence |
| Open balances | 10% | Higher open balance lowers score |

### Score formula

```text
trust_score = SUM(normalized_factor_i * weight_i)
```

Scores are clamped to 0..100 and converted to operator language:

- **80-100:** “Customer always settles up.”
- **65-79:** “Mostly reliable.”
- **40-64:** “Mixed behavior: keep the front tight.”
- **0-39:** “High risk right now.”

### Automatic updates

Trust score refresh is triggered by:
- new front extensions
- payments
- balance forgiveness
- purchases

Implemented with audit triggers and API recalculation flow.

---

## 2) Recommended Credit Limit

### Inputs
- Trust score
- Average purchase size
- Payment reliability
- Unpaid fronts
- Current credit limit

### Formula

```text
base_limit = average_transaction_size * 2.5
trust_multiplier = 0.6 + (trust_score / 100)
reliability_penalty = max(0.5, 1 - unpaid_front_count * 0.15)
payment_boost = 0.8 + (payments_on_time_ratio * 0.4)
recommended_limit = base_limit * trust_multiplier * reliability_penalty * payment_boost
hard_cap = max(current_limit * 1.5, average_transaction_size * 4)
final_limit = clamp(recommended_limit, 50, hard_cap)
```

Operator override is always allowed and logged.

---

## 3) Real-Time Front Approval

Returns one of:
- `APPROVE`
- `CAUTION`
- `DENY`

### Decision inputs
- Trust score
- Current balance and projected utilization
- Days since last payment
- Amount being fronted
- Inventory quantity and reorder threshold
- Product scarcity level

### Rule behavior
- High trust + safe utilization + healthy stock → `APPROVE`
- Mid trust or tightening balance/inventory → `CAUTION`
- Over-limit, stale payments, or scarce/low stock with weak trust → `DENY`

Operator messages are plain-language:
- “Looks good. This front is safe.”
- “Balance getting high. Double-check before fronting.”
- “Too risky right now. Hold this front.”

---

## 4) Inventory-Aware Intelligence

Inventory impacts fronting in real time:

- If `quantity_on_hand < reorder_threshold`: add low stock risk, push toward `CAUTION`/`DENY`
- If scarcity is `HIGH`: strongly penalize approval score
- If stock is healthy and scarcity is low: modest positive adjustment

---

## 5) Data Schema Additions

### `customers`
- `trust_score INTEGER`
- `recommended_credit_limit DECIMAL(12,2)`
- `credit_risk_flags JSONB`
- `payment_behavior_metrics JSONB`
- `trust_score_updated_at TIMESTAMP`

### `drx_front_decisions`
Stores every real-time front decision for analytics and QA.

### `drx_intelligence_audit_logs`
Stores intelligence-related event logs for traceability.

### Triggering / jobs
- Trigger-based event capture on `credit_transactions`, `sales`, and customer intelligence fields.
- Daily scoring recalculation job recommended using scheduler/cron calling the intelligence refresh API.

---

## 6) API Endpoints

### `POST /api/credit/intelligence/front-approval`
Evaluates customer + inventory + request amount and returns:
- trust score breakdown
- recommended credit limit
- front suggestion (`APPROVE|CAUTION|DENY`)
- confidence, reasons, risk flags

Request:
```json
{
  "customer_id": "uuid",
  "business_id": "uuid",
  "inventory_id": "uuid",
  "amount_being_fronted": 95
}
```

---

## 7) POS Integration Logic

At checkout front flow:
1. cashier selects customer and item(s)
2. POS calls front-approval endpoint
3. UI shows status chip + reasons
4. operator can proceed or override
5. final decision stored in `drx_front_decisions`

---

## 8) UX Components (simple language)

- **Trust score badge** on customer profile
- **Front approval indicator** in POS checkout
- **Credit limit suggestion prompt** before front confirm
- **Risk warning chips**:
  - “Balance getting high.”
  - “Inventory running low.”
  - “Payment overdue.”
- **Dashboard insights**:
  - top reliable customers
  - customers trending risky
  - scarce products frequently requested on front

---

## 9) Risk Flags

- `MULTIPLE_UNPAID_FRONTS`
- `HIGH_FORGIVEN_BALANCE`
- `PAYMENT_STALE`
- `OPEN_BALANCE_HIGH`
- `LOW_STOCK`
- `PRODUCT_SCARCE`
- `LIMIT_EXCEEDED`

---

## 10) Edge Cases

- New customers with little/no history → start with conservative defaults
- Missing payment data → neutral assumptions with caution weighting
- Zero or missing inventory → caution/deny bias
- Manual override always possible with mandatory reason capture
- Stale score timestamp → prompt background refresh

---

## 11) Audit Logging

All decision-relevant writes are logged with:
- event type
- business/customer context
- old/new payload snapshot
- timestamp

This supports explainability and operator accountability without heavy ML infrastructure.
