export type AppStoreSubmissionStatus =
  | "testflight_beta"
  | "blocked_pending_product_review"
  | "public_release_ready";

export interface AppStoreCopyContract {
  schemaVersion: 1;
  status: AppStoreSubmissionStatus;
  name: string;
  subtitle: string;
  primaryCategory: "Business";
  secondaryCategory: "Productivity";
  keywords: string;
  promotionalText: string;
  description: string;
  screenshotCaptions: readonly string[];
  screenshotPlan: readonly AppStoreScreenshotSpec[];
  marketingUrl: string;
  supportUrl: string;
  privacyPolicyUrl: string;
  reviewNotes: string;
  submissionBlockers: readonly string[];
}

export interface AppStoreScreenshotSpec {
  caption: string;
  requiredState: string;
  source: "native_ios";
  dataPolicy: "fictional";
}

export const appStoreScreenshotPlan: readonly AppStoreScreenshotSpec[] = [
  {
    caption: "Keep checkout moving",
    requiredState: "New sale screen with fictional products and a clear total",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "Know what's in stock",
    requiredState: "Products list with a visible low-stock state",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "See today's numbers",
    requiredState:
      "Home with current sales, best seller, and low-stock details",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "Control team access",
    requiredState:
      "Team access screen with clearly labeled roles and permissions",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "See who changed what",
    requiredState:
      "Activity history with fictional users, actions, and timestamps",
    source: "native_ios",
    dataPolicy: "fictional",
  },
];

export const appStoreCopy: AppStoreCopyContract = {
  schemaVersion: 1,
  status: "blocked_pending_product_review",
  name: "Deelrx CRM",
  subtitle: "Stock, Sales & Customers",
  primaryCategory: "Business",
  secondaryCategory: "Productivity",
  keywords: "stock,sales,customers,products,payments,balances,retail,store",
  promotionalText:
    "Know what you have, what you sold, what you made, and who still owes you.",
  description: `Keep track of customers, products, stock, sales, and payments. Deelrx CRM helps you see what came in, what sold, what you made, and which balances are due.

Use New sale to record a sale. Check Sales for saved sales and Payments for customer payments and balances due. DRX records the payment details you enter; it does not move money for you.

Use Products to check stock, add stock, fix a count, and review stock history. Check Home for a summary of your business.

Deelrx CRM is for businesses that sell physical goods. It is not a consumer marketplace, delivery service, payment network, lender, debt collector, or legal, tax, financial, or compliance advisor. Features and availability may vary by platform.`,
  screenshotCaptions: appStoreScreenshotPlan.map(
    (screenshot) => screenshot.caption,
  ),
  screenshotPlan: appStoreScreenshotPlan,
  marketingUrl: "https://deelrxcrm.com",
  supportUrl: "https://deelrxcrm.com/resources",
  privacyPolicyUrl: "https://deelrxcrm.com/legal/privacy",
  reviewNotes: `Deelrx CRM helps merchants keep records for physical-goods sales at their own locations. It is not a consumer marketplace and does not provide consumer product discovery or delivery ordering.

The app supports unit-based and weight-based inventory. Optional customer store-account features record merchant-managed purchases, payments, and balances. Reviewer credentials must be supplied in the secure App Store Connect review fields and the review environment must remain available for the full review window.

The public-release metadata must not be submitted while the app remains a beta. TestFlight is the beta distribution channel. The product owner must confirm that every accessible feature matches this description before changing the contract status to public_release_ready.`,
  submissionBlockers: [
    "Confirm that accessible cannabis-specific fields do not conflict with the independent-retail listing or require regulated-retail review notes.",
    "Confirm that accessible credit-risk, credit-issuance, or underwriting-like functionality does not conflict with the merchant-recordkeeping description.",
    "Confirm the production reviewer account, backend availability, privacy disclosures, age rating, and payment model in App Store Connect.",
    "Keep beta distribution in TestFlight; do not use this public-release description for an incomplete build.",
  ],
};
