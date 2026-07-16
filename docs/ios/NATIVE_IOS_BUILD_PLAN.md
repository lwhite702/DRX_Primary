# DRX Native iOS Build Plan

## Objective

Build a native SwiftUI operator application for DRX that consumes the existing DRX server APIs and preserves the web application as the administrative and configuration surface.

The iOS application must not duplicate server-owned business logic. Inventory mutation, FIFO allocation, credit enforcement, privacy-policy enforcement, tenancy resolution, audit logging, and reconciliation remain authoritative on the server.

## Initial Product Scope

The first beta targets daily operator workflows:

1. Authentication and active-business resolution
2. Operational dashboard
3. Inventory lookup and low-stock visibility
4. Inventory intake and adjustment submission
5. POS product search, cart, preflight, and checkout
6. Customer alias search, privacy-safe exact lookup, quick creation, and ticket attachment
7. Front/credit eligibility display and server-enforced checkout
8. Pending intake approval visibility for authorized managers
9. Inventory and transaction audit summaries
10. Settings needed for session, privacy display, and business switching

## Deferred From Initial Native Beta

- Full administrative configuration
- Database or privacy-protocol administration
- Large reporting workbooks
- Bulk imports and exports
- Migration tooling
- Compliance administration
- Direct database access
- Client-side FIFO or profitability calculations

## Native Architecture

### Platform

- Swift 6
- SwiftUI
- iOS 17 minimum
- Observation framework with `@Observable`
- Structured concurrency using async/await
- `NavigationStack` with typed destinations
- `TabView` for primary operator areas
- URLSession-based API client
- Keychain-backed session token storage
- Local cache limited to non-authoritative display data

### App Structure

```text
apps/ios/
  DRXApp/
    App/
      DRXApp.swift
      AppEnvironment.swift
      AppRouter.swift
      AppTab.swift
    Core/
      API/
      Auth/
      Models/
      Persistence/
      Security/
      Observability/
      FeatureFlags/
    Features/
      Authentication/
      Dashboard/
      Inventory/
      Intake/
      Approvals/
      POS/
      Customers/
      Credit/
      Audit/
      Settings/
    DesignSystem/
      Components/
      Tokens/
      Accessibility/
    Resources/
  DRXAppTests/
  DRXAppUITests/
```

## Navigation Model

Primary tabs:

- Dashboard
- POS
- Inventory
- Customers
- More

Manager-only destinations are resolved from server-returned permissions and include approvals, audit, and operational settings.

## State Ownership

- App session and dependency graph are root-owned.
- Feature state remains local to each feature using `@Observable` models.
- Shared services are injected through SwiftUI environment values.
- Views never call live services directly from `body`.
- Every network-backed screen has explicit idle, loading, loaded, empty, and error states.

## API Boundary Rules

The iOS app must use existing server endpoints or versioned mobile-facing equivalents.

The client must not:

- connect directly to Supabase or Postgres
- perform FIFO allocation
- decrement inventory locally as authoritative state
- calculate credit eligibility as authoritative state
- decrypt customer PII without a server-approved contract
- bypass active-business or role checks
- infer authorization solely from UI visibility

## Required API Contracts

### Session

- Current authenticated operator
- Active business
- Roles and permissions
- Feature flags
- Privacy display permissions

### Inventory

- Product list and search
- Product detail
- Low-stock list
- Intake submission
- Adjustment submission
- Pending approval list
- Approval decision
- Audit summary

### POS

- Product search
- Customer lookup
- Customer quick creation
- Stock and credit preflight
- Checkout with idempotency key
- Sale result and receipt summary

### Customer

- Alias search
- Exact phone/email hash-backed lookup through the server
- Customer detail normalized for the requesting operator
- Create/update using privacy-profile field permissions
- Ephemeral creation option when allowed
- Credit summary

## Security Requirements

- Tokens stored in Keychain only
- No secrets embedded in the app bundle
- No direct service-role credentials
- TLS-only API communication
- Server authorization required for every mutation
- Sensitive customer fields masked by default where policy requires
- Screen privacy state must not weaken server permissions
- Logging must redact PII, tokens, payment data, and encryption material

## Offline Policy

Initial beta is online-required for mutations.

Permitted local behavior:

- cached product and dashboard display
- locally retained cart before checkout
- retryable request drafts

Prohibited offline behavior:

- finalizing sales
- decrementing stock
- approving intake
- changing credit balances
- creating authoritative customer records

## Observability

Required native coverage:

- application launch and session restoration
- authentication success/failure
- API request failures by endpoint class
- POS preflight and checkout failures
- checkout completion
- inventory submission failures
- customer lookup misses
- privacy-policy decode/render failures
- crash reporting and performance traces

No observability payload may include plaintext customer PII.

## Delivery Phases

### Phase 0: Contract Audit

- Inventory all web endpoints required by native workflows
- Identify cookie-only assumptions
- Define mobile authentication token exchange
- Normalize error response envelopes
- Identify endpoints that return raw database rows
- Define versioned DTOs for native clients

### Phase 1: Native Foundation

- Create Xcode project and schemes
- Add app shell, dependency injection, routing, and design tokens
- Implement API client, auth session, Keychain storage, and mock services
- Add unit-test and UI-test targets

### Phase 2: Read-Only Operations

- Dashboard
- Inventory search and detail
- Customer search and detail
- Low-stock and pending-approval views

### Phase 3: POS Core

- Product search
- Cart
- Customer attachment
- Preflight
- Idempotent checkout
- Sale result

### Phase 4: Inventory Mutations

- Intake submission
- Adjustment submission
- Manager approval flow
- Audit summaries

### Phase 5: Beta Hardening

- Accessibility pass
- Sentry/PostHog integration or approved equivalents
- Feature flags and kill switches
- TestFlight configuration
- Privacy manifest and App Store privacy answers
- Performance and concurrency testing

## Acceptance Criteria For First TestFlight Build

- Operator can authenticate and restore a session
- Active business and role are displayed correctly
- Inventory list matches server state
- Customer lookup uses privacy-safe server contracts
- POS checkout uses preflight and an idempotency key
- Failed checkout cannot silently decrement stock
- Successful checkout refreshes affected inventory
- Manager-only actions are server-enforced
- No customer PII is written to logs
- All primary screens expose accessible labels and usable dynamic type
- Unit tests cover API decoding, session restoration, cart totals, idempotency generation, and error mapping
- UI tests cover sign-in shell, inventory search, customer attach, and successful mocked checkout

## Immediate Repository Work

1. Audit current API authentication assumptions for native token use.
2. Define shared versioned response DTOs for inventory, customers, POS, permissions, flags, and errors.
3. Repair privacy-native customer search and POS lookup before native adoption.
4. Normalize realtime behavior as targeted invalidation rather than raw row injection.
5. Scaffold the Xcode project under `apps/ios` after API contracts are confirmed.
