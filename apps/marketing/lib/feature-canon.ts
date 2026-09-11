export type FeatureStatus = "live" | "beta" | "planned";

export interface FeatureBullet {
  text: string;
  status: FeatureStatus;
}

export interface FeatureSection {
  id:
    | "fast-pos"
    | "quick-pos"
    | "inventory"
    | "customers"
    | "reports"
    | "team-control"
    | "multi-location"
    | "desktop-mobile";
  title: string;
  intro: string;
  bullets: FeatureBullet[];
}

export interface PrivacyExample {
  label: string;
  lines: string[];
}

export interface PrivacyBlock {
  id:
    | "alias-first-customer-tracking"
    | "privacy-profiles"
    | "strong-encryption"
    | "drx-vault-mode"
    | "minimal-data-engine"
    | "protexion-mode"
    | "ephemeral-customer-profiles"
    | "data-retention-controls";
  title: string;
  status: FeatureStatus;
  body: string;
  bullets: string[];
  examples?: PrivacyExample[];
}

export type OperatorShowcaseCardId =
  | "point-of-sale"
  | "inventory"
  | "customer-accounts"
  | "customers"
  | "pricing"
  | "anywhere-access"
  | "activity-control";

export interface OperatorShowcaseCard {
  id: OperatorShowcaseCardId;
  title: string;
  subtitle: string;
  status: "live" | "beta";
}

export interface OperatorShowcaseSection {
  eyebrow: string;
  heading: string;
  supportingLines: [string, string];
  cards: OperatorShowcaseCard[];
}

export interface ProductDetailContent {
  slug:
    | "sales-checkout"
    | "inventory-control"
    | "customers-credit"
    | "operations-visibility"
    | "team-access-security";
  title: string;
  metaDescription: string;
  what: string;
  why: string;
  proof: FeatureBullet[];
  limitations: FeatureBullet[];
}

export const featureStatusLabels: Record<FeatureStatus, string> = {
  live: "Live",
  beta: "Beta",
  planned: "Planned",
};

export const drxAudience = {
  primary: "Independent retailers",
  includes: [
    "Owner-operated shops",
    "Pop-up retailers",
    "Service businesses that sell products",
  ],
  eyebrow: "Built for independent retail",
  headlineLead: "For the ones who run it,",
  headlineAccent: "not the ones who talk about it.",
  headline: "For the ones who run it, not the ones who talk about it.",
  supportingPromise:
    "Add sales, check stock, see balances due, and choose who can see what.",
  proofLabels: ["Fast sales", "Clear stock", "Controlled access"],
} as const;

export const drxPositioning = {
  brand: "DRX",
  headline: "Deelrx CRM. Keep the business straight.",
  summary:
    "DRX helps independent sellers keep customers, products, stock, sales, payments, and balances due in one place.",
  punchlines: [
    "No bloated menus.",
    "No setup theater.",
    "No corporate maze.",
    "Just clear records for the work you already do.",
  ],
};

export const whyDrxExists = {
  intro: "Most sales tools make simple work feel complicated.",
  operators: [
    "Run lean",
    "Move fast",
    "Want clarity without confusion",
    "Need structure without corporate headaches",
    "Care about privacy and control",
  ],
  close: "Simple. Fast. In control.",
};

export const marketingFeatureSections: FeatureSection[] = [
  {
    id: "fast-pos",
    title: "New sale",
    intro:
      "When the line is building, you do not need a lecture. You need speed.",
    bullets: [
      { text: "Clean, fast checkout screen", status: "live" },
      { text: "Barcode scanning", status: "live" },
      { text: "Quick product search", status: "live" },
      { text: "Easy discounts", status: "live" },
      { text: "Multiple payment types", status: "live" },
      { text: "Customer lookup at checkout", status: "live" },
      { text: "Refund tracking", status: "beta" },
      { text: "Sale history", status: "live" },
    ],
  },
  {
    id: "quick-pos",
    title: "New sale basics",
    intro:
      "Sometimes you do not need charts or reports. You just need to sell.",
    bullets: [
      { text: "Scan product", status: "live" },
      { text: "Adjust quantity", status: "live" },
      { text: "Apply discount", status: "live" },
      { text: "Take payment", status: "live" },
      { text: "Done", status: "live" },
    ],
  },
  {
    id: "inventory",
    title: "Products and stock",
    intro: "Stop guessing what is in stock.",
    bullets: [
      { text: "Live stock counts", status: "live" },
      { text: "Low stock alerts", status: "live" },
      { text: "SKU and barcode support", status: "live" },
      { text: "Batch tracking", status: "live" },
      { text: "Vendor tracking", status: "live" },
      { text: "Purchase order tracking", status: "beta" },
      { text: "Cost and profit visibility", status: "live" },
      { text: "Clear history when a stock count changes", status: "live" },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    intro: "Know who is buying and how often.",
    bullets: [
      { text: "Customer profiles", status: "live" },
      { text: "Purchase history", status: "live" },
      { text: "Notes and tags", status: "beta" },
      { text: "Loyalty tracking support", status: "beta" },
      { text: "Basic customer insights", status: "live" },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    intro: "No fluff metrics. Just the numbers you need.",
    bullets: [
      { text: "Daily, weekly, monthly sales reports", status: "live" },
      { text: "Best-selling products", status: "live" },
      { text: "Sales by category", status: "live" },
      { text: "Money made", status: "live" },
      { text: "Downloadable reports", status: "beta" },
      { text: "Simple Home summary", status: "live" },
    ],
  },
  {
    id: "team-control",
    title: "Team access",
    intro: "Not everyone needs full access.",
    bullets: [
      { text: "Admin, Manager, and Operator roles", status: "live" },
      { text: "Custom access levels", status: "live" },
      { text: "Track who processes refunds", status: "live" },
      { text: "Track who adjusts inventory", status: "live" },
      { text: "Secure login system", status: "live" },
      { text: "Activity logs by user", status: "live" },
    ],
  },
  {
    id: "multi-location",
    title: "Locations",
    intro: "Running more than one spot should not kill visibility.",
    bullets: [
      { text: "Separate store views", status: "beta" },
      { text: "Location-based reporting", status: "beta" },
      { text: "Central admin access", status: "beta" },
      { text: "Clean separation between storefronts", status: "beta" },
    ],
  },
  {
    id: "desktop-mobile",
    title: "Supported devices",
    intro:
      "Run the floor from the counter and check the operation from supported mobile clients.",
    bullets: [
      { text: "Full dashboard on desktop", status: "live" },
      { text: "Mobile-friendly checkout", status: "live" },
      { text: "Cloud-based access", status: "live" },
      { text: "Log in from anywhere", status: "live" },
    ],
  },
];

export const drxPrivacy = {
  title: "Privacy",
  brandLines: ["See what’s saved", "Choose who can see it"],
  concept: [
    "Many sales tools ask for more customer details than you need.",
    "DRX lets you keep less.",
  ],
  principle: "collect less data and protect the rest.",
  blocks: [
    {
      id: "alias-first-customer-tracking",
      title: "Save less customer information",
      status: "live",
      body: "DRX does not force real names or personal info just to run checkout.",
      bullets: [
        "Track customers with nicknames or aliases.",
        "Phone number, email, address, and notes are optional.",
        "You can run transactions without attaching a customer profile at all.",
        "Collect only what you actually need.",
      ],
      examples: [
        {
          label: "Alias examples",
          lines: ["Big Mike", "Blue Honda", "VIP 23"],
        },
      ],
    },
    {
      id: "privacy-profiles",
      title: "Choose what’s saved",
      status: "live",
      body: "Choose how much customer information DRX saves.",
      bullets: [
        "Hide details: save an alias only.",
        "Protect details: save contact details when you need them.",
        "Keep details: save the full customer record.",
        "Change this later in Settings.",
      ],
    },
    {
      id: "strong-encryption",
      title: "Protect details",
      status: "live",
      body: "DRX encrypts sensitive customer details before storing them.",
      bullets: [
        "Encrypted fields include phone numbers, emails, addresses, and notes.",
      ],
    },
    {
      id: "drx-vault-mode",
      title: "Protect stored details",
      status: "live",
      body: "The keys that unlock protected details are kept outside the database.",
      bullets: [
        "Database records keep encrypted values only.",
        "Separate key storage adds another layer of protection.",
      ],
    },
    {
      id: "minimal-data-engine",
      title: "What’s saved",
      status: "live",
      body: "See how much customer information is saved so you can remove what you do not need.",
      bullets: [
        "Aliases stored",
        "Phone numbers stored",
        "Emails stored",
        "Addresses stored",
        "Notes stored",
      ],
    },
    {
      id: "protexion-mode",
      title: "Hide details",
      status: "live",
      body: "When privacy matters, DRX can hide customer details on screen.",
      bullets: [
        "Use masking to reduce shoulder-surfing risk on shared screens.",
      ],
      examples: [
        {
          label: "Details shown",
          lines: ["Alias: Big Mike", "Phone: 404-555-9811"],
        },
        {
          label: "Details hidden",
          lines: ["Alias: B*** M***", "Phone: Hidden"],
        },
      ],
    },
    {
      id: "ephemeral-customer-profiles",
      title: "Delete temporary records",
      status: "live",
      body: "Set a customer record to delete after a short time.",
      bullets: ["24 hours", "7 days", "30 days"],
    },
    {
      id: "data-retention-controls",
      title: "Delete old records",
      status: "live",
      body: "You control how long customer data stays in the system. DRX can remove inactive records automatically.",
      bullets: [
        "Set retention windows by policy.",
        "Avoid unnecessary data sitting around forever.",
      ],
    },
  ] satisfies PrivacyBlock[],
  closing:
    "Most systems collect everything and keep it forever. DRX collects less, protects what exists, and lets you stay in control.",
};

export const operatorShowcaseCanon: OperatorShowcaseSection = {
  eyebrow: "What DRX Does",
  heading: "Built for operators.",
  supportingLines: [
    "Serious tools for independent retail.",
    "No fluff. No corporate nonsense. Just control.",
  ],
  cards: [
    {
      id: "point-of-sale",
      title: "New sale",
      subtitle: "Find it, add it, take payment, done.",
      status: "live",
    },
    {
      id: "inventory",
      title: "Products",
      subtitle: "Know what you have, what moved, and what is low.",
      status: "live",
    },
    {
      id: "customer-accounts",
      title: "Customer Store Accounts",
      subtitle: "Record purchases, payments, and account balances.",
      status: "live",
    },
    {
      id: "customers",
      title: "Customers",
      subtitle: "Know your people. History, preferences, balances.",
      status: "beta",
    },
    {
      id: "pricing",
      title: "Pricing",
      subtitle: "Review price, cost, and margin context in one place.",
      status: "live",
    },
    {
      id: "anywhere-access",
      title: "Use DRX where it’s supported",
      subtitle: "Sign in from supported desktop and mobile devices.",
      status: "live",
    },
    {
      id: "activity-control",
      title: "Change history",
      subtitle: "See who made a supported change and when.",
      status: "live",
    },
  ],
};

export const productDetailCanon: Record<
  ProductDetailContent["slug"],
  ProductDetailContent
> = {
  "sales-checkout": {
    slug: "sales-checkout",
    title: "Sales and checkout",
    metaDescription:
      "Add sales with search, scanning, discounts, payment choices, customer lookup, and sale history.",
    what: "Search, scan, adjust, and finish the sale. DRX keeps checkout moving when the line is building.",
    why: "Checkout touches stock, money, and customer context at the same time. Speed without control costs you twice.",
    proof: marketingFeatureSections.find((s) => s.id === "fast-pos")!.bullets,
    limitations: [
      { text: "Refund tracking language remains beta-scoped", status: "beta" },
      { text: "Claim only what appears in current POS routes", status: "beta" },
    ],
  },
  "inventory-control": {
    slug: "inventory-control",
    title: "Products and stock",
    metaDescription:
      "See stock counts, add what came in, fix counts, and use product codes or barcodes.",
    what: "See what sold, what is on hand, and what is running low without chasing separate spreadsheets.",
    why: "Wrong stock counts slow sales and make your numbers harder to trust.",
    proof: marketingFeatureSections.find((s) => s.id === "inventory")!.bullets,
    limitations: [
      {
        text: "Purchase order tracking is currently beta-scoped",
        status: "beta",
      },
      { text: "Some stock tools are still in beta", status: "beta" },
    ],
  },
  "customers-credit": {
    slug: "customers-credit",
    title: "Customers and payments",
    metaDescription:
      "Keep customer details, sales history, payments, and merchant-managed balances together.",
    what: "Keep customer history, payments, and balances due together.",
    why: "Scattered records make it easy to miss a payment or lose track of what happened.",
    proof: marketingFeatureSections.find((s) => s.id === "customers")!.bullets,
    limitations: [
      {
        text: "Notes/tags and loyalty support are beta-scoped claims",
        status: "beta",
      },
      {
        text: "Store accounts are merchant recordkeeping, not a consumer financial product",
        status: "beta",
      },
    ],
  },
  "operations-visibility": {
    slug: "operations-visibility",
    title: "Reports and trends",
    metaDescription: "See sales, stock, and what you made in clear reports.",
    what: "If something is off, you should see it before close.",
    why: "You should see what needs attention before the day ends.",
    proof: marketingFeatureSections.find((s) => s.id === "reports")!.bullets,
    limitations: [
      {
        text: "Downloadable/deep report claims remain beta-scoped",
        status: "beta",
      },
      {
        text: "Keep business-intelligence language practical and bounded",
        status: "beta",
      },
    ],
  },
  "team-access-security": {
    slug: "team-access-security",
    title: "Team access and security controls",
    metaDescription:
      "Role-based control, activity accountability, and secure access patterns for real storefront teams.",
    what: "You stay in control without hovering over everyone.",
    why: "Most operational problems come from unclear access and weak accountability.",
    proof: marketingFeatureSections.find((s) => s.id === "team-control")!
      .bullets,
    limitations: [
      {
        text: "Role setup quality still determines day-to-day safety",
        status: "beta",
      },
      {
        text: "Do not imply one-click full compliance automation",
        status: "beta",
      },
    ],
  },
};

export const productHubCards = (
  Object.values(productDetailCanon) as ProductDetailContent[]
).map((item) => ({
  href: `/product/${item.slug}`,
  title: item.title,
  desc: item.metaDescription,
}));
