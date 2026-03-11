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

export const drxPositioning = {
  brand: "DRX",
  headline: "Deelrx CRM. Built for operators who run real businesses.",
  summary:
    "DRX is a fast, no-nonsense POS and customer system made for independent dispensaries and street-smart entrepreneurs. It keeps your sales tight, your inventory accurate, and your team accountable without feeling like corporate software.",
  punchlines: [
    "No bloated menus.",
    "No complicated setup.",
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
    intro: "Run your shop from the counter or from the car.",
    bullets: [
      { text: "Full dashboard on desktop", status: "live" },
      { text: "Mobile-friendly checkout", status: "live" },
      { text: "Cloud-based access", status: "live" },
      { text: "Log in from anywhere", status: "live" },
    ],
  },
];

export const productDetailCanon: Record<ProductDetailContent["slug"], ProductDetailContent> = {
  "sales-checkout": {
    slug: "sales-checkout",
    title: "Sales and checkout",
    metaDescription:
      "Fast POS flow for real operators: scan, search, discounts, payments, customer lookup, and transaction visibility.",
    what:
      "You ring it. You collect. You move. DRX keeps checkout fast when the line is building.",
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
      "You always know what is moving and what is running low. No guessing.",
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
    title: "Customers and credit",
    metaDescription:
      "Customer profiles, purchase history, credit context, and practical customer workflows built for speed.",
    what:
      "Keep it organized. Keep it personal. Stay in control.",
    why:
      "Disconnected customer records turn follow-up and credit discipline into guesswork.",
    proof: marketingFeatureSections.find((s) => s.id === "customers")!.bullets,
    limitations: [
      { text: "Notes/tags and loyalty support are beta-scoped claims", status: "beta" },
      { text: "Avoid enterprise CRM automation claims", status: "beta" },
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
