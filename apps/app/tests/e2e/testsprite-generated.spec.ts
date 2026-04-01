import { test } from "@playwright/test";

/**
 * Auto-generated from testsprite_tests/testsprite_frontend_test_plan.json.
 * Each case is skipped by default; convert steps into concrete selectors/assertions.
 */

const testspriteCases = [
  {
    id: `TC001`,
    title: `Complete onboarding with all required fields and enable transactions`,
    category: `Onboarding & Owner Business Settings`,
    priority: `High`,
    description: `Verifies an owner can complete the full onboarding and sees a success state indicating transactions are enabled.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Onboarding"`,
      },
      {
        type: `action`,
        description: `Type "Deelrx Test Shop" into the Business Name field`,
      },
      {
        type: `action`,
        description: `Type "5551234567" into the Shop Phone Number field`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Supported Units dropdown`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Privacy Preset dropdown`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "transactions are enabled" is visible`,
      },
    ],
  },
  {
    id: `TC002`,
    title: `Submit onboarding without selecting Privacy Preset shows required-field errors and keeps transactions disabled`,
    category: `Onboarding & Owner Business Settings`,
    priority: `High`,
    description: `Verifies missing required onboarding inputs are highlighted and the user is warned that transactions remain disabled.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Onboarding"`,
      },
      {
        type: `action`,
        description: `Type "Deelrx Partial Shop" into the Business Name field`,
      },
      {
        type: `action`,
        description: `Type "5550001111" into the Shop Phone Number field`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Supported Units dropdown`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Onboarding incomplete — transactions disabled" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Privacy Preset" is visible`,
      },
    ],
  },
  {
    id: `TC003`,
    title: `Required validation: submitting onboarding with all fields empty blocks completion`,
    category: `Onboarding & Owner Business Settings`,
    priority: `High`,
    description: `Verifies the onboarding cannot be submitted with empty required fields and the user sees visible validation feedback.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Onboarding"`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Business Name" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Shop Phone Number" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Privacy Preset" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Onboarding incomplete — transactions disabled" is visible`,
      },
    ],
  },
  {
    id: `TC004`,
    title: `Phone number format validation prevents successful onboarding`,
    category: `Onboarding & Owner Business Settings`,
    priority: `Medium`,
    description: `Verifies an invalid shop phone number is rejected and onboarding does not complete.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Onboarding"`,
      },
      {
        type: `action`,
        description: `Type "Deelrx Phone Validation Shop" into the Business Name field`,
      },
      {
        type: `action`,
        description: `Type "abcd" into the Shop Phone Number field`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Supported Units dropdown`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Privacy Preset dropdown`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Onboarding incomplete — transactions disabled" is visible`,
      },
    ],
  },
  {
    id: `TC005`,
    title: `Supported Units is required: omitting it blocks onboarding completion`,
    category: `Onboarding & Owner Business Settings`,
    priority: `Medium`,
    description: `Verifies the Supported Units selection is required and missing it prevents enabling transactions.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Onboarding"`,
      },
      {
        type: `action`,
        description: `Type "Deelrx Units Required Shop" into the Business Name field`,
      },
      {
        type: `action`,
        description: `Type "5552223333" into the Shop Phone Number field`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Privacy Preset dropdown`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Onboarding incomplete — transactions disabled" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Supported Units" is visible`,
      },
    ],
  },
  {
    id: `TC006`,
    title: `Quickpick quantities can be configured during onboarding and saved`,
    category: `Onboarding & Owner Business Settings`,
    priority: `Medium`,
    description: `Verifies the user can configure quickpick product quantities and proceed to a successful onboarding submission.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify text "Quickpick" is visible`,
      },
      {
        type: `action`,
        description: `Type "Deelrx Quickpick Shop" into the Business Name field`,
      },
      {
        type: `action`,
        description: `Type "5554447777" into the Shop Phone Number field`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Supported Units dropdown`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Privacy Preset dropdown`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "transactions are enabled" is visible`,
      },
    ],
  },
  {
    id: `TC007`,
    title: `Initial user roles step is present and does not block submission when completed`,
    category: `Onboarding & Owner Business Settings`,
    priority: `Low`,
    description: `Verifies the onboarding includes initial role definition and completion leads to enabled transactions.`,
    inferredRoute: `/onboarding`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /onboarding`,
      },
      {
        type: `assertion`,
        description: `Verify text "Roles" is visible`,
      },
      {
        type: `action`,
        description: `Type "Deelrx Roles Shop" into the Business Name field`,
      },
      {
        type: `action`,
        description: `Type "5558889999" into the Shop Phone Number field`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Supported Units dropdown`,
      },
      {
        type: `action`,
        description: `Select a valid option from the Privacy Preset dropdown`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "transactions are enabled" is visible`,
      },
    ],
  },
  {
    id: `TC008`,
    title: `Complete a basic POS sale from product search to sale confirmation`,
    category: `POS checkout workflow`,
    priority: `High`,
    description: `Verifies a staff user can start a sale, add a product, complete payment, and see the completion confirmation.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "POS" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos"`,
      },
      {
        type: `action`,
        description: `Click the "Start Sale" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/sale"`,
      },
      {
        type: `action`,
        description: `Type "cola" into the product search field`,
      },
      {
        type: `action`,
        description: `Click on the first product in the search results list`,
      },
      {
        type: `action`,
        description: `Click the "Add to cart" button`,
      },
      {
        type: `action`,
        description: `Click the "Checkout" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/payment"`,
      },
      {
        type: `action`,
        description: `Select "Cash" from the payment method dropdown`,
      },
      {
        type: `action`,
        description: `Click the "Confirm payment" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/complete"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Sale" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Complete" is visible`,
      },
    ],
  },
  {
    id: `TC009`,
    title: `Cannot proceed to checkout with an empty cart`,
    category: `POS checkout workflow`,
    priority: `Medium`,
    description: `Verifies the POS sale screen prevents checkout when no items are in the cart.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "POS" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Start Sale" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/sale"`,
      },
      {
        type: `action`,
        description: `Click the "Checkout" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Add items" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/sale"`,
      },
    ],
  },
  {
    id: `TC010`,
    title: `Product search with no results shows a clear empty state`,
    category: `POS checkout workflow`,
    priority: `Medium`,
    description: `Verifies that searching for a non-existent product displays a no-results message and does not add anything to the cart.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "POS" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Start Sale" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/sale"`,
      },
      {
        type: `action`,
        description: `Type "zzzz-nonexistent-item-12345" into the product search field`,
      },
      {
        type: `assertion`,
        description: `Verify text "No results" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Cart" is visible`,
      },
    ],
  },
  {
    id: `TC011`,
    title: `Selecting a payment method is required before confirming payment`,
    category: `POS checkout workflow`,
    priority: `Medium`,
    description: `Verifies the payment page blocks confirmation until a payment method is chosen.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "POS" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Start Sale" button`,
      },
      {
        type: `action`,
        description: `Type "juice" into the product search field`,
      },
      {
        type: `action`,
        description: `Click on the first product in the search results list`,
      },
      {
        type: `action`,
        description: `Click the "Add to cart" button`,
      },
      {
        type: `action`,
        description: `Click the "Checkout" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/payment"`,
      },
      {
        type: `action`,
        description: `Click the "Confirm payment" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Select a payment method" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/pos/payment"`,
      },
    ],
  },
  {
    id: `TC012`,
    title: `Inventory intake end-to-end with quantity, reason, and optional cost`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `High`,
    description: `Verifies a user can complete an inventory intake and see a confirmation summary including a recent audit entry.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/inventory"`,
      },
      {
        type: `action`,
        description: `Click the "Intake" button`,
      },
    ],
  },
  {
    id: `TC013`,
    title: `Inventory intake submission shows confirmation summary and audit entry`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `High`,
    description: `Verifies the intake workflow can be submitted after selecting product, unit, reason, and optional cost, and that a confirmation/audit indicator is visible.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Intake" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/inventory/intake"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Reason" is visible`,
      },
    ],
  },
  {
    id: `TC014`,
    title: `Inventory adjustment end-to-end (increment/decrement/set) updates inventory and shows audit indication`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `High`,
    description: `Verifies a user can submit an inventory adjustment and see updated inventory information with an audit log indicator.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/inventory"`,
      },
      {
        type: `action`,
        description: `Click the "Adjust" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/inventory/adjust"`,
      },
    ],
  },
  {
    id: `TC015`,
    title: `Inventory adjustment requires selecting a reason before submit`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `Medium`,
    description: `Verifies the adjustment workflow blocks submission when a required Reason is not selected and shows a visible validation message.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Adjust" button`,
      },
      {
        type: `action`,
        description: `Click the "Submit" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Reason" is visible`,
      },
    ],
  },
  {
    id: `TC016`,
    title: `Intake validation: unit not allowed by business settings`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `High`,
    description: `Verifies attempting to submit an intake using a disallowed unit shows the expected validation error message.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Intake" button`,
      },
      {
        type: `action`,
        description: `Select a unit option that is marked as not enabled/not allowed in the unit selector`,
      },
      {
        type: `assertion`,
        description: `Verify text "Unit not allowed by business settings" is visible`,
      },
    ],
  },
  {
    id: `TC017`,
    title: `Adjustment access control: staff without adjust permission is blocked`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `High`,
    description: `Verifies a user without adjustment permission cannot submit an adjustment and sees an Access Denied message.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Adjust" button`,
      },
      {
        type: `action`,
        description: `Click the "Submit" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Access Denied" is visible`,
      },
    ],
  },
  {
    id: `TC018`,
    title: `Intake requires a product selection before submission`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `Medium`,
    description: `Verifies the intake workflow blocks submission when no product has been selected and shows a visible validation message.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Intake" button`,
      },
      {
        type: `action`,
        description: `Click the "Submit intake" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Select product" is visible`,
      },
    ],
  },
  {
    id: `TC019`,
    title: `Adjustment type selection is required (increment/decrement/set) before quantity entry or submit`,
    category: `Inventory operations (Intake & Adjustments)`,
    priority: `Low`,
    description: `Verifies the adjustment workflow enforces choosing an adjustment type and shows a visible prompt/error when missing.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `action`,
        description: `Click "Inventory" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click the "Adjust" button`,
      },
      {
        type: `action`,
        description: `Click the "Submit" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Adjustment type" is visible`,
      },
    ],
  },
  {
    id: `TC020`,
    title: `Browse customers and open a customer detail page from search results`,
    category: `Customer and Sales management`,
    priority: `High`,
    description: `Verifies an authenticated user can view the customer list, search, and open a customer detail page showing key sections.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Customers" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers"`,
      },
      {
        type: `action`,
        description: `Type "a" into the customer search field`,
      },
      {
        type: `action`,
        description: `Click the first customer row in the results list`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers/"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Contact" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Credit" is visible`,
      },
    ],
  },
  {
    id: `TC021`,
    title: `Customer list loads and displays standard list UI elements`,
    category: `Customer and Sales management`,
    priority: `Medium`,
    description: `Verifies the customers page loads successfully and shows expected list controls and results area.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Customers" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Customers" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify element "customer search" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify element "customer list" is visible`,
      },
    ],
  },
  {
    id: `TC022`,
    title: `Search for a nonexistent customer shows a No results empty state`,
    category: `Customer and Sales management`,
    priority: `High`,
    description: `Verifies searching for an unlikely customer name shows a visible empty-state message and guidance.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Customers" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers"`,
      },
      {
        type: `action`,
        description: `Type "zzzz-nonexistent-customer-12345" into the customer search field`,
      },
      {
        type: `assertion`,
        description: `Verify text "No results" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Quick-create" is visible`,
      },
    ],
  },
  {
    id: `TC023`,
    title: `Clear customer search returns from empty state back to results`,
    category: `Customer and Sales management`,
    priority: `Medium`,
    description: `Verifies that clearing the search input removes the No results state and restores the list view.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Customers" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers"`,
      },
      {
        type: `action`,
        description: `Type "zzzz-nonexistent-customer-12345" into the customer search field`,
      },
      {
        type: `assertion`,
        description: `Verify text "No results" is visible`,
      },
      {
        type: `action`,
        description: `Click the "Clear" button in the search area`,
      },
      {
        type: `assertion`,
        description: `Verify element "customer list" is visible`,
      },
    ],
  },
  {
    id: `TC024`,
    title: `Browse sales and open a sale detail page from the list`,
    category: `Customer and Sales management`,
    priority: `High`,
    description: `Verifies an authenticated user can view the sales list and open a sale detail page.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Sales" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/sales"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Sales" is visible`,
      },
      {
        type: `action`,
        description: `Click the first sale row in the sales list`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/sales/"`,
      },
    ],
  },
  {
    id: `TC025`,
    title: `Sale detail page shows items, totals, and audit trail sections`,
    category: `Customer and Sales management`,
    priority: `High`,
    description: `Verifies the sale detail view exposes the core reconciliation sections for a selected sale.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Sales" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/sales"`,
      },
      {
        type: `action`,
        description: `Click the first sale row in the sales list`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/sales/"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Items" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Totals" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "Audit" is visible`,
      },
    ],
  },
  {
    id: `TC026`,
    title: `Sales list loads and displays standard list UI elements`,
    category: `Customer and Sales management`,
    priority: `Medium`,
    description: `Verifies the sales page loads successfully and shows expected list content area for browsing.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Sales" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/sales"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Sales" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify element "sales list" is visible`,
      },
    ],
  },
  {
    id: `TC027`,
    title: `Customer detail page supports viewing without visible errors after navigation from list`,
    category: `Customer and Sales management`,
    priority: `Medium`,
    description: `Verifies navigating from customers list to a detail page results in a stable detail view with identifying information visible.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click on "Customers" in the main navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers"`,
      },
      {
        type: `action`,
        description: `Click the first customer row in the customer list`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/customers/"`,
      },
      {
        type: `assertion`,
        description: `Verify element "customer name" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify element "customer contact information" is visible`,
      },
    ],
  },
  {
    id: `TC028`,
    title: `Invite a new team member from Team Settings and see pending status`,
    category: `Team and role administration & Audit logs`,
    priority: `High`,
    description: `Verifies an authenticated user can invite a team member with a selected role and the invite appears as pending in the team list.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Settings" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Team" in Settings`,
      },
      {
        type: `assertion`,
        description: `Verify text "Team" is visible`,
      },
    ],
  },
  {
    id: `TC029`,
    title: `Complete invite flow with email + role selection and verify pending member appears`,
    category: `Team and role administration & Audit logs`,
    priority: `High`,
    description: `Verifies the full invite workflow: open invite modal, fill email, choose role, submit, and confirm pending member appears in list.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Settings" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Team" in Settings`,
      },
      {
        type: `action`,
        description: `Click the "Invite" button`,
      },
      {
        type: `action`,
        description: `Type "invitee.qa+pending@example.com" into the invitee email field`,
      },
      {
        type: `action`,
        description: `Select "Staff" from the role dropdown`,
      },
      {
        type: `action`,
        description: `Click the "Send invite" or "Submit" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "invitee.qa+pending@example.com" is visible`,
      },
    ],
  },
  {
    id: `TC030`,
    title: `Invite validation: submitting without email shows an error and does not add pending member`,
    category: `Team and role administration & Audit logs`,
    priority: `Medium`,
    description: `Verifies invite form validation prevents submission when email is missing.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Settings" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Team" in Settings`,
      },
      {
        type: `action`,
        description: `Click the "Invite" button`,
      },
      {
        type: `action`,
        description: `Click the "Send invite" or "Submit" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Email" is visible`,
      },
    ],
  },
  {
    id: `TC031`,
    title: `Invite validation: invalid email format shows an error`,
    category: `Team and role administration & Audit logs`,
    priority: `Medium`,
    description: `Verifies invite form rejects an invalid email format and shows a visible validation message.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Settings" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Team" in Settings`,
      },
      {
        type: `action`,
        description: `Click the "Invite" button`,
      },
      {
        type: `action`,
        description: `Type "not-an-email" into the invitee email field`,
      },
      {
        type: `action`,
        description: `Click the "Send invite" or "Submit" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "valid email" is visible`,
      },
    ],
  },
  {
    id: `TC032`,
    title: `Admin changes a user role and sees success feedback`,
    category: `Team and role administration & Audit logs`,
    priority: `High`,
    description: `Verifies an admin can locate a user in Admin Users, change their role, confirm, and see a visible success update.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Admin" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Users" in the Admin navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/admin/users"`,
      },
      {
        type: `action`,
        description: `Type "qa.rolechange.target" into the user search field`,
      },
      {
        type: `action`,
        description: `Click on the user row that matches "qa.rolechange.target"`,
      },
      {
        type: `action`,
        description: `Select "Manager" from the role selector dropdown`,
      },
      {
        type: `action`,
        description: `Click the "Confirm" or "Save" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Role updated" is visible`,
      },
    ],
  },
  {
    id: `TC033`,
    title: `Admin role change produces an audit log entry`,
    category: `Team and role administration & Audit logs`,
    priority: `High`,
    description: `Verifies that after changing a user's role, an audit log entry is visible in the Admin Audit page.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Admin" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Users" in the Admin navigation`,
      },
      {
        type: `action`,
        description: `Type "qa.rolechange.target" into the user search field`,
      },
      {
        type: `action`,
        description: `Click on the user row that matches "qa.rolechange.target"`,
      },
      {
        type: `action`,
        description: `Select "Staff" from the role selector dropdown`,
      },
      {
        type: `action`,
        description: `Click the "Confirm" or "Save" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Role updated" is visible`,
      },
      {
        type: `action`,
        description: `Click "Audit" in the Admin navigation`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/admin/audit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "role" is visible`,
      },
    ],
  },
  {
    id: `TC034`,
    title: `Admin Users search yields no results message for unknown user`,
    category: `Team and role administration & Audit logs`,
    priority: `Low`,
    description: `Verifies searching for a non-existent user shows a visible empty state and does not show unrelated users.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Admin" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Users" in the Admin navigation`,
      },
      {
        type: `action`,
        description: `Type "user.does.not.exist.999999" into the user search field`,
      },
      {
        type: `assertion`,
        description: `Verify text "No users" is visible`,
      },
    ],
  },
  {
    id: `TC035`,
    title: `Manager cannot assign Owner role in Team Settings (Access Denied)`,
    category: `Team and role administration & Audit logs`,
    priority: `High`,
    description: `Verifies a manager-scoped user is blocked from assigning an Owner role and sees an Access Denied message with no visible member list change.`,
    inferredRoute: `/login`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /login`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_USER}}" into the email/username field`,
      },
      {
        type: `action`,
        description: `Type "{{LOGIN_PASSWORD}}" into the password field`,
      },
      {
        type: `action`,
        description: `Click the "Sign in" button`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/dashboard"`,
      },
      {
        type: `action`,
        description: `Click "Settings" in the main navigation`,
      },
      {
        type: `action`,
        description: `Click "Team" in Settings`,
      },
      {
        type: `assertion`,
        description: `Verify text "Team" is visible`,
      },
      {
        type: `action`,
        description: `Click on an existing team member row to open role editing`,
      },
      {
        type: `action`,
        description: `Select "Owner" from the role dropdown`,
      },
      {
        type: `action`,
        description: `Click the "Save" button`,
      },
      {
        type: `assertion`,
        description: `Verify text "Access Denied" is visible`,
      },
    ],
  },
  {
    id: `TC036`,
    title: `Browse from landing page to Product page and verify core content is visible`,
    category: `Marketing site, docs and waitlist`,
    priority: `High`,
    description: `Verifies a public visitor can navigate from the marketing landing page to the Product overview and see product content without logging in.`,
    inferredRoute: `/`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/"`,
      },
      {
        type: `action`,
        description: `Click on "Product"`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/product"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Product"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Product" is visible`,
      },
    ],
  },
  {
    id: `TC037`,
    title: `Navigate from Product page to Resources landing page`,
    category: `Marketing site, docs and waitlist`,
    priority: `High`,
    description: `Verifies a public visitor can reach the Resources library from marketing navigation and see Resources content.`,
    inferredRoute: `/product`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /product`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/product"`,
      },
      {
        type: `action`,
        description: `Click on "Resources"`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/resources"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Resources"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Resources" is visible`,
      },
    ],
  },
  {
    id: `TC038`,
    title: `Open Guides from Resources and verify Guides index loads`,
    category: `Marketing site, docs and waitlist`,
    priority: `Medium`,
    description: `Verifies a public visitor can open the Guides section from Resources and see guides index content.`,
    inferredRoute: `/resources`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /resources`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/resources"`,
      },
      {
        type: `action`,
        description: `Click on "Guides"`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/resources/guides"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Guides"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Guides" is visible`,
      },
    ],
  },
  {
    id: `TC039`,
    title: `Open Changelog from Resources and verify Changelog page loads`,
    category: `Marketing site, docs and waitlist`,
    priority: `Medium`,
    description: `Verifies a public visitor can open the Changelog from Resources and see changelog content.`,
    inferredRoute: `/resources`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /resources`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/resources"`,
      },
      {
        type: `action`,
        description: `Click on "Changelog"`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/resources/changelog"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Changelog"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Changelog" is visible`,
      },
    ],
  },
  {
    id: `TC040`,
    title: `Navigate from landing page CTA to Waitlist page`,
    category: `Marketing site, docs and waitlist`,
    priority: `High`,
    description: `Verifies the Get Started/Waitlist CTA on the landing page routes the visitor to the waitlist form.`,
    inferredRoute: `/`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/"`,
      },
      {
        type: `action`,
        description: `Click on "Get Started"`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/waitlist"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Waitlist"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Waitlist" is visible`,
      },
    ],
  },
  {
    id: `TC041`,
    title: `Submit waitlist form with valid email and verify confirmation is shown`,
    category: `Marketing site, docs and waitlist`,
    priority: `High`,
    description: `Verifies a public visitor can join the waitlist by submitting the form and seeing a visible confirmation state.`,
    inferredRoute: `/waitlist`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /waitlist`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/waitlist"`,
      },
      {
        type: `action`,
        description: `Type "e2e.tester+waitlist@example.com" into the email field`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Thank you" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify text "waitlist" is visible`,
      },
    ],
  },
  {
    id: `TC042`,
    title: `Waitlist form validation: submit without email shows 'Email required'`,
    category: `Marketing site, docs and waitlist`,
    priority: `High`,
    description: `Verifies the waitlist form blocks submission when email is missing and shows a visible validation error.`,
    inferredRoute: `/waitlist`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /waitlist`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/waitlist"`,
      },
      {
        type: `action`,
        description: `Click on "Submit"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Email required" is visible`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/waitlist"`,
      },
    ],
  },
  {
    id: `TC043`,
    title: `Open Privacy policy from Legal/Privacy route and verify content is visible`,
    category: `Marketing site, docs and waitlist`,
    priority: `Low`,
    description: `Verifies a public visitor can access the Privacy page and see policy content without authentication.`,
    inferredRoute: `/privacy`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /privacy`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/privacy"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Privacy"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Privacy" is visible`,
      },
    ],
  },
  {
    id: `TC044`,
    title: `Open Terms page and verify content is visible`,
    category: `Marketing site, docs and waitlist`,
    priority: `Low`,
    description: `Verifies a public visitor can access the Terms page and see terms content without authentication.`,
    inferredRoute: `/terms`,
    steps: [
      {
        type: `action`,
        description: `Navigate to /terms`,
      },
      {
        type: `assertion`,
        description: `Verify URL contains "/terms"`,
      },
      {
        type: `assertion`,
        description: `Verify page title contains "Terms"`,
      },
      {
        type: `assertion`,
        description: `Verify text "Terms" is visible`,
      },
    ],
  },
]; 

for (const tc of testspriteCases) {
  test.describe(tc.category, () => {
    test.skip(`${tc.id} ${tc.title}`, async ({ page }) => {
      // Route inference is best-effort from a 'Navigate to ...' step.
      await page.goto(tc.inferredRoute || '/');

      // Replace with real actions/assertions as you localize each case.
      for (const step of tc.steps) {
        await test.step(`[${step.type}] ${step.description}`, async () => {
          // TODO: implement using page.getByRole/getByLabel and expect(...).toBeVisible() etc.
        });
      }
    });
  });
}
