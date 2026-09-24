export type MessagePatternKind =
  | "success"
  | "error"
  | "warning"
  | "empty"
  | "confirmation"
  | "destructive"
  | "permission"
  | "privacy"
  | "upgrade"
  | "payment-failure"
  | "offline";

export type MessagePattern = {
  kind: MessagePatternKind;
  structure: string;
  example: string;
  humorAllowed: boolean;
};

export type ContentCatalogV1 = {
  schemaVersion: 1;
  brand: {
    formalName: string;
    shortName: string;
    promise: string;
    supportingLine: string;
  };
  navigation: Record<string, string>;
  terms: Record<string, string>;
  privacy: {
    section: string;
    summary: string;
    hideDetails: string;
    protectDetails: string;
    whatIsSaved: string;
    deleteOldRecords: string;
    presets: Record<string, { label: string; description: string }>;
  };
  actions: Record<string, string>;
  messages: Record<string, string | { title: string; body: string }>;
  messagePatterns: readonly MessagePattern[];
};

export type CopyInventoryEntry = {
  id: string;
  surface: "marketing" | "web" | "pwa" | "ios" | "android" | "help" | "email" | "push" | "app-store" | "google-play" | "sales" | "support";
  source: string;
  context: string;
  currentText: string;
  replacementText: string;
  feature: string;
  severity: "high" | "medium" | "low";
  platform: string;
  plan: string;
  evidence: string;
  reviewState: "implemented" | "draft" | "blocked";
};

export const drxContent = {
  schemaVersion: 1,
  brand: {
    formalName: "Deelrx CRM",
    shortName: "DRX",
    promise: "Know what you have, what you sold, what you made, and who still owes you.",
    supportingLine: "You handle the work. DRX keeps the numbers straight.",
  },
  navigation: {
    home: "Home",
    customers: "Customers",
    products: "Products",
    sales: "Sales",
    newSale: "New sale",
    payments: "Payments",
    deliveries: "Deliveries",
    loyalty: "Loyalty",
    reports: "Reports",
    trends: "Trends",
    team: "Team",
    settings: "Settings",
    help: "Help",
    more: "More",
  },
  terms: {
    stock: "Stock",
    addStock: "Add stock",
    fixCount: "Fix count",
    stockHistory: "Stock history",
    sale: "Sale",
    payment: "Payment",
    balanceDue: "Balance due",
    teamMember: "Team member",
    business: "Business",
    location: "Location",
    history: "History",
  },
  privacy: {
    section: "Privacy",
    summary: "DRX collects less and protects what you add.",
    hideDetails: "Hide details",
    protectDetails: "Protect details",
    whatIsSaved: "What’s saved",
    deleteOldRecords: "Delete old records",
    presets: {
      hideDetails: {
        label: "Hide details",
        description: "Save an alias only. Delete inactive customer records after 30 days.",
      },
      protectDetails: {
        label: "Protect details",
        description: "Save contact details when you need them. Delete inactive customer records after 180 days.",
      },
      keepDetails: {
        label: "Keep details",
        description: "Save full customer details. Delete inactive customer records after 365 days.",
      },
    },
  },
  actions: {
    addCustomer: "Add customer",
    addProduct: "Add product",
    addSale: "Add sale",
    addStock: "Add stock",
    markPaid: "Mark paid",
    recordPayment: "Record payment",
    save: "Save",
    saveNote: "Save note",
    sendReminder: "Send reminder",
    seeDetails: "See details",
    tryAgain: "Try again",
    notNow: "Not now",
    keepEditing: "Keep editing",
    remove: "Remove",
  },
  messages: {
    saved: "Changes saved.",
    saleSaved: "Sale saved.",
    paymentAdded: "Payment added.",
    customerAdded: "Customer added.",
    stockUpdated: "Stock updated.",
    noteSaved: "Note saved.",
    inviteSent: "Invite sent.",
    genericError: "That didn’t work. Try again.",
    saveError: "That didn’t save. Your details are still here. Try again.",
    offline: "You’re offline. Check your connection and try again.",
    noCustomers: {
      title: "No customers yet",
      body: "Add the people you sell to most.",
    },
    noProducts: {
      title: "No products yet",
      body: "Add your first product and start keeping count.",
    },
    nothingDue: {
      title: "Nothing due",
      body: "Everybody is paid up. Nice.",
    },
  },
  messagePatterns: [
    { kind: "success", structure: "[Result].", example: "Payment added.", humorAllowed: true },
    { kind: "error", structure: "[What failed]. [What to do].", example: "That didn’t save. Try again.", humorAllowed: false },
    { kind: "warning", structure: "[Risk]. [Safe next step].", example: "This count looks off. Check it before saving.", humorAllowed: false },
    { kind: "empty", structure: "[What is missing]. [Next action].", example: "No products yet. Add your first product.", humorAllowed: true },
    { kind: "confirmation", structure: "[Action and effect].", example: "Save this sale?", humorAllowed: false },
    { kind: "destructive", structure: "[What will be removed]. [Recovery state].", example: "This note will be deleted. You can’t undo this.", humorAllowed: false },
    { kind: "permission", structure: "[Who needs access]. [What they can do].", example: "Managers can see sales and change stock.", humorAllowed: false },
    { kind: "privacy", structure: "[What is saved]. [Who can see it]. [When it is deleted].", example: "DRX saves an alias only. Team members with customer access can see it.", humorAllowed: false },
    { kind: "upgrade", structure: "[Feature or limit]. [Approved plan and price].", example: "More locations need a paid plan. Check pricing for the current cost.", humorAllowed: false },
    { kind: "payment-failure", structure: "[What failed]. [What to check]. [Charge state].", example: "That payment didn’t go through. Check the details and try again. No charge was made.", humorAllowed: false },
    { kind: "offline", structure: "[Connection state]. [Next action].", example: "You’re offline. Check your connection and try again.", humorAllowed: false },
  ],
} as const satisfies ContentCatalogV1;

export type DrxContent = typeof drxContent;

export const approvedGlossary = [
  { concept: "Main summary screen", approved: "Home", avoid: ["Dashboard", "Overview", "Command center"] },
  { concept: "Product list", approved: "Products", avoid: ["Inventory", "Catalog manager"] },
  { concept: "Product quantity", approved: "Stock", avoid: ["Inventory level", "Units available"] },
  { concept: "Start checkout", approved: "New sale", avoid: ["POS", "Point of Sale", "Quick POS"] },
  { concept: "Past purchases", approved: "Sales", avoid: ["Orders & Receipts", "Transactions"] },
  { concept: "Money a customer owes", approved: "Balance due", avoid: ["Outstanding balance", "Receivable"] },
  { concept: "Customer money records", approved: "Payments", avoid: ["Store Credit", "Credit center"] },
  { concept: "Add product quantity", approved: "Add stock", avoid: ["Intake", "Replenish inventory"] },
  { concept: "Correct product quantity", approved: "Fix count", avoid: ["Adjustment", "Reconciliation"] },
  { concept: "Person with account access", approved: "Team member", avoid: ["User", "Operator", "Staff account"] },
  { concept: "Account boundary", approved: "Business", avoid: ["Workspace", "Tenant"] },
  { concept: "Physical store", approved: "Location", avoid: ["Workspace", "Tenant"] },
  { concept: "Pattern summary", approved: "Trends", avoid: ["Insights", "Intelligence center"] },
] as const;

export const featureMessageMap = [
  {
    feature: "Customers",
    problem: "Customer details and notes get scattered.",
    benefit: "Keep each customer’s details, sales, and balance together.",
    proof: "Customer records connect details, sales, notes, and balance history.",
    headline: "Keep your people straight.",
    inProductLabel: "Customers",
    helpTerm: "Customers",
    availability: "Web, PWA, iOS, and Android; behavior still needs cross-platform release proof.",
    planAvailability: "Do not name a plan until pricing is approved.",
  },
  {
    feature: "Products",
    problem: "It is easy to lose track of what is left.",
    benefit: "See what came in, what went out, and what is running low.",
    proof: "Stock history records quantity changes and low-stock states.",
    headline: "Stop guessing what’s left.",
    inProductLabel: "Products",
    helpTerm: "Products",
    availability: "Web, PWA, iOS, and Android; stock actions vary by platform.",
    planAvailability: "Do not name a plan until pricing is approved.",
  },
  {
    feature: "Sales",
    problem: "Daily sales are hard to check across notes and messages.",
    benefit: "Keep each sale and payment in one clear history.",
    proof: "Saved sales include products, totals, tender details, and timestamps.",
    headline: "Know what sold.",
    inProductLabel: "Sales",
    helpTerm: "Sales",
    availability: "Web, PWA, iOS, and Android; tender options vary by platform.",
    planAvailability: "Do not name a plan until pricing is approved.",
  },
  {
    feature: "Payments",
    problem: "It is easy to forget who paid and who still owes you.",
    benefit: "See balances due and record what customers paid.",
    proof: "Customer balance records show amounts due and recorded payments.",
    headline: "See who still owes you.",
    inProductLabel: "Payments",
    helpTerm: "Payments",
    availability: "Available where customer balance features are enabled.",
    planAvailability: "Do not name a plan until pricing is approved.",
  },
  {
    feature: "Reports",
    problem: "One day’s numbers are spread across several places.",
    benefit: "Check sales, totals, and what is selling in one place.",
    proof: "Report views summarize saved sales and product activity.",
    headline: "Here’s what you made.",
    inProductLabel: "Reports",
    helpTerm: "Reports",
    availability: "Web and supported native views; exact reports vary by platform.",
    planAvailability: "Do not name a plan until pricing is approved.",
  },
] as const;
