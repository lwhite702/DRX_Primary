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
    label: "Start Shift",
    description: "Get a new store or operator ready without setup loops.",
    href: "/help/start",
    libraryHint: "Getting-started setup guides and role basics.",
  },
  {
    id: "sell",
    label: "Run Sale",
    description: "Fast checkout flow, tender handling, and receipts.",
    href: "/help/sell",
    libraryHint: "POS and checkout references.",
  },
  {
    id: "operations",
    label: "Run Operations",
    description: "Inventory, customers, credit follow-up, and reporting checks.",
    href: "/help/operations",
    libraryHint: "Inventory, products, customer, and credit workflows.",
  },
  {
    id: "troubleshoot",
    label: "Fix Problems",
    description: "High-signal checks before escalation.",
    href: "/help/troubleshoot",
    libraryHint: "Troubleshooting articles and escalation guidance.",
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
    title: "Create or verify business profile",
    route: "/onboarding",
    summary: "Business details power receipt identity, roles, and reporting context.",
    details: "Confirm branding, business metadata, and privacy defaults before launch.",
  },
  {
    title: "Load inventory with Intake",
    route: "/inventory/intake",
    summary: "Use intake to capture quantity and cost history before first sale.",
    details: "Avoid direct manual quantity edits when adding initial stock.",
  },
  {
    title: "Create operator accounts with proper role",
    route: "/settings/team",
    summary: "Assign owner/manager/staff roles to avoid permission friction mid-shift.",
    details: "Use least privilege and validate each role can reach expected workflows.",
  },
  {
    title: "Dry-run one checkout",
    route: "/pos/sale",
    summary: "Run one controlled sale to validate tax, tender, and receipt behavior.",
    details: "If totals look off, stop and verify workspace scope and pricing before opening.",
  },
];

export const HELP_SELL_CHECKLIST: HelpChecklistItem[] = [
  {
    title: "Start in Quick Sale",
    route: "/pos/sale",
    summary: "Search or scan item, confirm quantity, then move to payment.",
    details: "Use Quick Sale as the default path for speed and consistency.",
  },
  {
    title: "Pick tender and confirm customer context",
    route: "/credit",
    summary: "Credit tender requires an eligible customer account.",
    details: "Cash/card can proceed without customer profile for walk-ins.",
  },
  {
    title: "Complete receipt flow",
    route: "/sales",
    summary: "Confirm receipt status before starting the next transaction.",
    details: "If uncertain, check recent sales to avoid accidental duplicate charge attempts.",
  },
  {
    title: "Handle blocked checkout",
    route: "/help/troubleshoot",
    summary: "Use troubleshooting checks before rebuilding the cart from scratch.",
    details: "Stock and context mismatches are the most common blockers.",
  },
];

export const HELP_OPERATIONS_CHECKLIST: HelpChecklistItem[] = [
  {
    title: "Review low stock and intake queue",
    route: "/inventory",
    summary: "Check thresholds and pending intake to prevent shift interruptions.",
    details: "Low-stock signals are threshold-based, not velocity-based.",
  },
  {
    title: "Keep product data clean",
    route: "/inventory",
    summary: "Prevent duplicate SKUs and validate pricing before publish.",
    details: "Accurate catalog data reduces checkout and reporting defects.",
  },
  {
    title: "Track customer and credit follow-up",
    route: "/customers",
    summary: "Use customer history to reconcile partial credit payments.",
    details: "Missing contact data slows collections and support resolution.",
  },
  {
    title: "Close with reporting checks",
    route: "/reports",
    summary: "Verify business scope and date filters before acting on totals.",
    details: "Unexpected zeros usually indicate scope mismatch or incomplete checkout.",
  },
];

export const HELP_TROUBLESHOOT_ISSUES: HelpIssue[] = [
  {
    title: "Checkout blocked: insufficient stock",
    severity: "Operational",
    checks: [
      "Confirm on-hand quantity in Inventory.",
      "Reduce line quantity or remove unavailable items.",
      "If stock should exist, record intake/adjustment first.",
    ],
    recovery:
      "Fix stock records first. Avoid manual sale workarounds that break inventory and reporting alignment.",
  },
  {
    title: "Customer create/update fails",
    severity: "Data entry",
    checks: [
      "Ensure first name is present.",
      "Provide phone OR email (at least one required).",
      "Normalize phone formatting to avoid false duplicates.",
    ],
    recovery:
      "Retry with minimum required fields, then enrich profile details after record creation.",
  },
  {
    title: "Dashboard or report totals look wrong",
    severity: "Reporting",
    checks: [
      "Verify active business/workspace context.",
      "Check date range and filters.",
      "Confirm the sale fully completed (receipt/sale ID).",
    ],
    recovery:
      "Cross-check recent sales activity before escalating as a reporting defect.",
  },
  {
    title: "Unexpected error during checkout/save",
    severity: "High",
    checks: [
      "Retry once before refreshing.",
      "Check if transaction already completed.",
      "Capture exact route, action, and tender/product context.",
    ],
    recovery:
      "Escalate with route, action sequence, expected vs actual outcome, and receipt/sale evidence.",
  },
];

export const HELP_LIBRARY_CONTEXT: Record<HelpTopicId, HelpLibraryContext> = {
  start: {
    topic: "start",
    label: "Getting Started Library",
    subtitle: "Setup, onboarding, and role basics.",
    filters: "tag:category:getting-started",
    path: "/",
  },
  sell: {
    topic: "sell",
    label: "Sales Library",
    subtitle: "POS workflows, tenders, and checkout guidance.",
    filters: "tag:category:pos",
    path: "/",
  },
  operations: {
    topic: "operations",
    label: "Operations Library",
    subtitle: "Inventory, products, customers, credit, and reporting help.",
    filters: "tag:category:inventory",
    path: "/",
  },
  troubleshoot: {
    topic: "troubleshoot",
    label: "Troubleshooting Library",
    subtitle: "Issue resolution and escalation playbooks.",
    filters: "tag:category:pos",
    path: "/",
  },
};

export const DEFAULT_HELP_TOPIC: HelpTopicId = "start";

export function normalizeHelpTopic(topic: string | null | undefined): HelpTopicId {
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
