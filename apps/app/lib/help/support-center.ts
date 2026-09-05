export type HelpTopicId = "start" | "sell" | "operations" | "troubleshoot";

export type HelpSectionRoute = {
  id: HelpTopicId;
  label: string;
  description: string;
  href: string;
  libraryHint: string;
};

export type HelpChecklistItem = {
  title: string;
  route?: string;
  summary: string;
  details?: string;
};

export type HelpIssue = {
  title: string;
  severity: "Operational" | "Data entry" | "Reporting" | "High";
  checks: string[];
  recovery: string;
};

export type HelpLibraryContext = {
  topic: HelpTopicId;
  label: string;
  subtitle: string;
  filters: string;
  path: string;
};

export const HELP_SECTION_ROUTES: HelpSectionRoute[] = [
  {
    id: "start",
    label: "Get started",
    description: "Set up your business and team.",
    href: "/help/start",
    libraryHint: "Business setup and team access.",
  },
  {
    id: "sell",
    label: "New sale",
    description: "Add products, take payment, and save the sale.",
    href: "/help/sell",
    libraryHint: "Sales, payments, and receipts.",
  },
  {
    id: "operations",
    label: "Keep things straight",
    description: "Check products, customers, payments, and reports.",
    href: "/help/operations",
    libraryHint: "Products, customers, payments, and reports.",
  },
  {
    id: "troubleshoot",
    label: "Fix a problem",
    description: "Try the fastest checks first.",
    href: "/help/troubleshoot",
    libraryHint: "Quick fixes and ways to get help.",
  },
];

export const HELP_SECTION_BY_ID: Record<HelpTopicId, HelpSectionRoute> =
  HELP_SECTION_ROUTES.reduce(
    (acc, route) => {
      acc[route.id] = route;
      return acc;
    },
    {} as Record<HelpTopicId, HelpSectionRoute>,
  );

export const HELP_START_CHECKLIST: HelpChecklistItem[] = [
  {
    title: "Check your business details",
    route: "/onboarding",
    summary: "These details appear on receipts and reports.",
    details:
      "Check the business name, location, and privacy choices before your first sale.",
  },
  {
    title: "Add your first stock",
    route: "/inventory/intake",
    summary: "Add what came in and what it cost.",
    details:
      "Use Add stock so the quantity and cost stay in the product history.",
  },
  {
    title: "Add team members",
    route: "/settings/team",
    summary: "Give each person the access they need.",
    details: "Check what each role can see before the team starts working.",
  },
  {
    title: "Try one sale",
    route: "/pos/sale",
    summary: "Check the tax, payment type, total, and receipt.",
    details:
      "If the total looks wrong, stop and check the business, price, and tax settings.",
  },
];

export const HELP_SELL_CHECKLIST: HelpChecklistItem[] = [
  {
    title: "Open New sale",
    route: "/pos/sale",
    summary: "Find or scan a product, check the amount, then take payment.",
    details: "New sale is the main way to record a sale.",
  },
  {
    title: "Choose a payment type",
    route: "/credit",
    summary: "A balance due needs a customer.",
    details: "Cash or card can be used without adding a walk-in customer.",
  },
  {
    title: "Check the saved sale",
    route: "/sales",
    summary: "Make sure the receipt is ready before starting another sale.",
    details: "If you’re not sure it saved, check Sales before trying again.",
  },
  {
    title: "Fix a blocked sale",
    route: "/help/troubleshoot",
    summary: "Check the message before rebuilding the sale.",
    details: "The most common causes are low stock or the wrong business.",
  },
];

export const HELP_OPERATIONS_CHECKLIST: HelpChecklistItem[] = [
  {
    title: "Check what’s running low",
    route: "/inventory",
    summary: "Check low-stock limits and stock waiting to be added.",
    details: "A product appears low when its count reaches the limit you set.",
  },
  {
    title: "Keep product data clean",
    route: "/inventory",
    summary: "Avoid duplicate SKUs and check prices before selling.",
    details: "Clean product details make sales and reports easier to trust.",
  },
  {
    title: "Check customer balances",
    route: "/customers",
    summary: "Use customer history to check partial payments.",
    details: "Only save contact details when you need them.",
  },
  {
    title: "Check the day’s numbers",
    route: "/reports",
    summary: "Check the business and date before trusting the total.",
    details:
      "A zero may mean the wrong date, the wrong business, or an unfinished sale.",
  },
];

export const HELP_TROUBLESHOOT_ISSUES: HelpIssue[] = [
  {
    title: "Checkout blocked: insufficient stock",
    severity: "Operational",
    checks: [
      "Check the on-hand count in Products.",
      "Reduce line quantity or remove unavailable items.",
      "If stock should exist, use Add stock or Fix count first.",
    ],
    recovery:
      "Fix the stock count first. Don’t force the sale through with the wrong count.",
  },
  {
    title: "Customer create/update fails",
    severity: "Data entry",
    checks: [
      "Ensure alias or name is present.",
      "Check that contact fields are valid if provided.",
      "Check that you’re in the right business.",
    ],
    recovery:
      "Try saving an alias first. Add other details after the customer is created.",
  },
  {
    title: "Home or report totals look wrong",
    severity: "Reporting",
    checks: [
      "Check that you’re in the right business.",
      "Check date range and filters.",
      "Confirm the sale fully completed (receipt/sale ID).",
    ],
    recovery:
      "Check recent Sales first. If the numbers still look wrong, contact support.",
  },
  {
    title: "Unexpected error during checkout/save",
    severity: "High",
    checks: [
      "Retry once before refreshing.",
      "Check whether the sale already saved.",
      "Write down what you tapped and which payment type you used.",
    ],
    recovery:
      "Contact support with the time, steps, expected result, and sale or receipt ID.",
  },
];

export const HELP_LIBRARY_CONTEXT: Record<HelpTopicId, HelpLibraryContext> = {
  start: {
    topic: "start",
    label: "Getting started",
    subtitle: "Business setup and team access.",
    filters: "tag:category:getting-started",
    path: "/",
  },
  sell: {
    topic: "sell",
    label: "Sales help",
    subtitle: "New sales, payments, and receipts.",
    filters: "tag:category:pos",
    path: "/",
  },
  operations: {
    topic: "operations",
    label: "Daily work",
    subtitle: "Products, customers, payments, and reports.",
    filters: "tag:category:inventory",
    path: "/",
  },
  troubleshoot: {
    topic: "troubleshoot",
    label: "Fix a problem",
    subtitle: "Quick checks and ways to get help.",
    filters: "tag:category:pos",
    path: "/",
  },
};

export const DEFAULT_HELP_TOPIC: HelpTopicId = "start";

export function normalizeHelpTopic(
  topic: string | null | undefined,
): HelpTopicId {
  if (!topic) return DEFAULT_HELP_TOPIC;
  if (topic in HELP_SECTION_BY_ID) {
    return topic as HelpTopicId;
  }
  return DEFAULT_HELP_TOPIC;
}

export function getHelpLibraryContext(
  topic: string | null | undefined,
): HelpLibraryContext {
  const normalizedTopic = normalizeHelpTopic(topic);
  return HELP_LIBRARY_CONTEXT[normalizedTopic];
}

export function buildHelpLibraryHref(
  topic: HelpTopicId,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({ topic });

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (!value) continue;
      params.set(key, value);
    }
  }

  return `/help/library?${params.toString()}`;
}
