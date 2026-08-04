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
    requiredState: "POS with a populated cart, fictional products, and a reviewable total",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "Know what's in stock",
    requiredState: "Inventory list with SKU context and a visible low-stock state",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "See today's numbers",
    requiredState: "Dashboard with current sales, best-seller, and low-stock context",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "Control team access",
    requiredState: "Team access screen with clearly labeled roles and permissions",
    source: "native_ios",
    dataPolicy: "fictional",
  },
  {
    caption: "Review activity history",
    requiredState: "Activity history with fictional users, actions, and timestamps",
    source: "native_ios",
    dataPolicy: "fictional",
  },
];

export const appStoreCopy: AppStoreCopyContract = {
  schemaVersion: 1,
  status: "blocked_pending_product_review",
  name: "Deelrx CRM",
  subtitle: "POS & Inventory for Retail",
  primaryCategory: "Business",
  secondaryCategory: "Productivity",
  keywords: "pos,inventory,retail,checkout,stock,sales,customers,store",
  promotionalText:
    "Keep checkout moving, know what is in stock, and control who can do what.",
  description: `Deelrx CRM is an operator-first point-of-sale and inventory workspace for independent retailers, owner-operated shops, pop-ups, and service businesses that carry stock.

Keep checkout moving with product search, barcode support, quantity adjustments, discounts, multiple tender types, customer lookup, and reviewable sale history.

Know what is on deck with stock-count visibility, low-stock alerts, SKU and barcode workflows, intake context, and logged inventory adjustments.

Run a tighter shift with operational dashboards, customer records, role-based access, and user activity context.

Deelrx CRM is a merchant operations tool for physical-goods sales. It is not a consumer marketplace, delivery service, payment network, lender, debt collector, or legal, tax, financial, or compliance advisor.`,
  screenshotCaptions: appStoreScreenshotPlan.map((screenshot) => screenshot.caption),
  screenshotPlan: appStoreScreenshotPlan,
  marketingUrl: "https://deelrxcrm.com",
  supportUrl: "https://deelrxcrm.com/resources",
  privacyPolicyUrl: "https://deelrxcrm.com/legal/privacy",
  reviewNotes: `Deelrx CRM is a merchant-facing operations tool for physical-goods sales at a merchant's own location. It is not a consumer marketplace and does not provide consumer product discovery or delivery ordering.

The app supports unit-based and weight-based inventory. Optional customer store-account features record merchant-managed purchases, payments, and balances. Reviewer credentials must be supplied in the secure App Store Connect review fields and the review environment must remain available for the full review window.

The public-release metadata must not be submitted while the app remains a beta. TestFlight is the beta distribution channel. The product owner must confirm that every accessible feature matches this description before changing the contract status to public_release_ready.`,
  submissionBlockers: [
    "Confirm that accessible cannabis-specific fields do not conflict with the independent-retail listing or require regulated-retail review notes.",
    "Confirm that accessible credit-risk, credit-issuance, or underwriting-like functionality does not conflict with the merchant-recordkeeping description.",
    "Confirm the production reviewer account, backend availability, privacy disclosures, age rating, and payment model in App Store Connect.",
    "Keep beta distribution in TestFlight; do not use this public-release description for an incomplete build.",
  ],
};
