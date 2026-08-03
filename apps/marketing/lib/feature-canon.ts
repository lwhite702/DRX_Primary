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

export interface PrivacyProtexionExample {
  label: string;
  lines: string[];
}

export interface PrivacyProtexionBlock {
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
  examples?: PrivacyProtexionExample[];
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
    "Inventory-carrying service businesses",
  ],
  eyebrow: "Built for independent retail",
  headline: "For the ones who run it, not the ones who talk about it.",
  supportingPromise:
    "Fast checkout, tighter inventory, clear sales records, and role-based control for independent shops that move fast.",
  proofLabels: ["Fast checkout", "Stock visibility", "Role-based access"],
} as const;

export const drxPositioning = {
  brand: "DRX",
  headline: "Deelrx CRM. Built for independent retail.",
  summary:
    "DRX is a fast, no-nonsense POS, inventory, and customer system for independent retailers, owner-operated shops, pop-ups, and service businesses that carry stock. It keeps checkout moving, inventory legible, and team access controlled without feeling like corporate software.",
  punchlines: [
    "No bloated menus.",
    "No setup theater.",
    'No "enterprise" energy.',
    "Just tools that help you sell, track, and grow.",
  ],
};

export const whyDrxExists = {
  intro:
    "Most POS systems are built for corporations with layers of managers and meetings about meetings.",
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
    title: "Fast Point of Sale",
    intro: "When the line is building, you do not need a lecture. You need speed.",
    bullets: [
      { text: "Clean, fast checkout screen", status: "live" },
      { text: "Barcode scanning", status: "live" },
      { text: "Quick product search", status: "live" },
      { text: "Easy discounts", status: "live" },
      { text: "Multiple payment types", status: "live" },
      { text: "Customer lookup at checkout", status: "live" },
      { text: "Refund tracking", status: "beta" },
      { text: "Transaction history", status: "live" },
    ],
  },
  {
    id: "quick-pos",
    title: "Quick POS Mode",
    intro: "Sometimes you do not need charts or reports. You just need to sell.",
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
    title: "Inventory That Actually Makes Sense",
    intro: "Stop guessing what is in stock.",
    bullets: [
      { text: "Live stock counts", status: "live" },
      { text: "Low stock alerts", status: "live" },
      { text: "SKU and barcode support", status: "live" },
      { text: "Batch tracking", status: "live" },
      { text: "Vendor tracking", status: "live" },
      { text: "Purchase order tracking", status: "beta" },
      { text: "Cost and profit visibility", status: "live" },
      { text: "Clear logs when inventory is adjusted", status: "live" },
    ],
  },
  {
    id: "customers",
    title: "Customer Tracking That Works",
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
    title: "Real Business Reports",
    intro: "No fluff metrics. Just the numbers you need.",
    bullets: [
      { text: "Daily, weekly, monthly sales reports", status: "live" },
      { text: "Best-selling products", status: "live" },
      { text: "Sales by category", status: "live" },
      { text: "Revenue tracking", status: "live" },
      { text: "Downloadable reports", status: "beta" },
      { text: "Simple dashboard overview", status: "live" },
    ],
  },
  {
    id: "team-control",
    title: "Team Control & Accountability",
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
    title: "Multi-Location Ready",
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
    title: "Works on Desktop and Mobile",
    intro: "Run the floor from the counter and check the operation from supported mobile clients.",
    bullets: [
      { text: "Full dashboard on desktop", status: "live" },
      { text: "Mobile-friendly checkout", status: "live" },
      { text: "Cloud-based access", status: "live" },
      { text: "Log in from anywhere", status: "live" },
    ],
  },
];

export const drxPrivacyProtexion = {
  title: "DRX Privacy ProteXion™",
  brandLines: [
    "Powered by DRX Intelligence™",
    "Protected by DRX Privacy ProteXion™",
  ],
  concept: [
    "Most POS and CRM systems collect way too much customer info and keep it forever.",
    "DRX does the opposite.",
  ],
  principle: "collect less data and protect the rest.",
  blocks: [
    {
      id: "alias-first-customer-tracking",
      title: "Alias-First Customer Tracking",
      status: "live",
      body: "DRX does not force real names or personal info just to run checkout.",
      bullets: [
        "Track customers with nicknames or aliases.",
        "Nearly every CRM field is optional: phone number, email address, address, and notes.",
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
      title: "Privacy Profiles",
      status: "live",
      body: "During onboarding, operators choose how private they want the system to be.",
      bullets: [
        "Alias Mode (Maximum Privacy): track with nicknames only and no personal info required.",
        "Standard Mode: light customer tracking with optional contact details.",
        "Business CRM Mode: full CRM features if you want to collect more information.",
        "These settings can be changed anytime.",
      ],
    },
    {
      id: "strong-encryption",
      title: "Strong Encryption",
      status: "live",
      body:
        "Sensitive customer information is encrypted. If someone somehow got database access, those values stay unreadable.",
      bullets: [
        "Encrypted fields include phone numbers, emails, addresses, and notes.",
      ],
    },
    {
      id: "drx-vault-mode",
      title: "DRX Vault Mode™",
      status: "live",
      body:
        "The keys that unlock encrypted data are controlled by your operator environment, not stored in the database.",
      bullets: [
        "Database records keep encrypted values only.",
        "Operator-controlled key handling adds another layer of protection.",
      ],
    },
    {
      id: "minimal-data-engine",
      title: "Minimal Data Engine",
      status: "live",
      body:
        "DRX shows exactly how much personal information exists in your system so you can keep your footprint small.",
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
      title: "ProteXion Mode",
      status: "live",
      body: "When privacy matters, DRX can hide customer details on screen.",
      bullets: [
        "Use masking to reduce shoulder-surfing risk on shared screens.",
      ],
      examples: [
        {
          label: "Normal View",
          lines: ["Alias: Big Mike", "Phone: 404-555-9811"],
        },
        {
          label: "ProteXion Mode",
          lines: ["Alias: B*** M***", "Phone: Hidden"],
        },
      ],
    },
    {
      id: "ephemeral-customer-profiles",
      title: "Ephemeral Customer Profiles",
      status: "live",
      body:
        "Need a temporary customer record for quick POS or a one-time buyer? DRX supports auto-delete windows.",
      bullets: [
        "24 hours",
        "7 days",
        "30 days",
      ],
    },
    {
      id: "data-retention-controls",
      title: "Data Retention Controls",
      status: "live",
      body:
        "You control how long customer data stays in the system. DRX can remove inactive records automatically.",
      bullets: [
        "Set retention windows by policy.",
        "Avoid unnecessary data sitting around forever.",
      ],
    },
  ] satisfies PrivacyProtexionBlock[],
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
      title: "Point of Sale",
      subtitle: "Quick sales entry. Tap, type, done.",
      status: "live",
    },
    {
      id: "inventory",
      title: "Inventory",
      subtitle: "Always know what you have and what moved.",
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
      title: "Anywhere Access",
      subtitle: "Authenticated access from supported desktop and mobile clients.",
      status: "live",
    },
    {
      id: "activity-control",
      title: "Activity & Control",
      subtitle: "Supported actions keep user context for review.",
      status: "live",
    },
  ],
};

export const productDetailCanon: Record<ProductDetailContent["slug"], ProductDetailContent> = {
  "sales-checkout": {
    slug: "sales-checkout",
    title: "Sales and checkout",
    metaDescription:
      "Fast POS flow for independent retail: scan, search, discounts, multiple tender types, customer lookup, and sale history.",
    what:
      "Search, scan, adjust, and finish the sale. DRX keeps checkout moving when the line is building.",
    why:
      "Checkout touches stock, money, and customer context at the same time. Speed without control costs you twice.",
    proof: marketingFeatureSections.find((s) => s.id === "fast-pos")!.bullets,
    limitations: [
      { text: "Refund tracking language remains beta-scoped", status: "beta" },
      { text: "Claim only what appears in current POS routes", status: "beta" },
    ],
  },
  "inventory-control": {
    slug: "inventory-control",
    title: "Inventory control",
    metaDescription:
      "Live stock visibility, intake and adjustment logging, SKU/barcode support, and practical inventory operations.",
    what:
      "See what sold, what is on hand, and what is running low without chasing separate spreadsheets.",
    why:
      "Bad inventory data slows checkout, hurts margin, and creates shift conflict.",
    proof: marketingFeatureSections.find((s) => s.id === "inventory")!.bullets,
    limitations: [
      { text: "Purchase order tracking is currently beta-scoped", status: "beta" },
      { text: "Some advanced inventory surfaces remain constrained", status: "beta" },
    ],
  },
  "customers-credit": {
    slug: "customers-credit",
    title: "Customers and store accounts",
    metaDescription:
      "Customer profiles, purchase history, and optional merchant-managed store account records built for independent retail.",
    what:
      "Keep customer history and optional store account records connected to the work at the counter.",
    why:
      "Disconnected customer records make follow-up, purchase history, and account reconciliation harder than they need to be.",
    proof: marketingFeatureSections.find((s) => s.id === "customers")!.bullets,
    limitations: [
      { text: "Notes/tags and loyalty support are beta-scoped claims", status: "beta" },
      { text: "Store accounts are merchant recordkeeping, not a consumer financial product", status: "beta" },
    ],
  },
  "operations-visibility": {
    slug: "operations-visibility",
    title: "Operations visibility",
    metaDescription:
      "Revenue, sales, inventory, and operating signals in one practical dashboard view.",
    what:
      "If something is off, you should see it before close.",
    why:
      "Operators need immediate signal, not fluffy reporting theater.",
    proof: marketingFeatureSections.find((s) => s.id === "reports")!.bullets,
    limitations: [
      { text: "Downloadable/deep report claims remain beta-scoped", status: "beta" },
      { text: "Keep business-intelligence language practical and bounded", status: "beta" },
    ],
  },
  "team-access-security": {
    slug: "team-access-security",
    title: "Team access and security controls",
    metaDescription:
      "Role-based control, activity accountability, and secure access patterns for real storefront teams.",
    what:
      "You stay in control without hovering over everyone.",
    why:
      "Most operational problems come from unclear access and weak accountability.",
    proof: marketingFeatureSections.find((s) => s.id === "team-control")!.bullets,
    limitations: [
      { text: "Role setup quality still determines day-to-day safety", status: "beta" },
      { text: "Do not imply one-click full compliance automation", status: "beta" },
    ],
  },
};

export const productHubCards = (Object.values(productDetailCanon) as ProductDetailContent[]).map((item) => ({
  href: `/product/${item.slug}`,
  title: item.title,
  desc: item.metaDescription,
}));
