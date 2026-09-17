import {
  BarChart3,
  Boxes,
  CreditCard,
  FileSearch,
  Fingerprint,
  Gauge,
  HandCoins,
  Landmark,
  Layers2,
  ListChecks,
  Lock,
  PackageSearch,
  QrCode,
  Radar,
  Receipt,
  ScanLine,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Tag,
  UserRoundSearch,
  Users,
  Vault,
  type LucideIcon,
} from "lucide-react";

import {
  drxPositioning,
  marketingFeatureSections,
  whyDrxExists,
} from "@/lib/feature-canon";
import { docsChangelogUrl, docsHelpdeskUrl } from "@/lib/featurebase-links";

export interface CyberNavItem {
  label: string;
  href: string;
}

export interface CyberMetric {
  value: string;
  label: string;
}

export interface OrbitNode {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface OrbitRing {
  id: "inner" | "middle" | "outer";
  radius: number;
  durationSeconds: number;
  reverse: boolean;
  nodeSizeClassName: string;
  nodes: OrbitNode[];
}

export interface ContrastStep {
  id: string;
  title: string;
  body: string;
}

const totalFeatureBullets = marketingFeatureSections.reduce(
  (total, section) => total + section.bullets.length,
  0,
);

const liveBullets = marketingFeatureSections.reduce(
  (total, section) =>
    total + section.bullets.filter((bullet) => bullet.status === "live").length,
  0,
);

const betaBullets = marketingFeatureSections.reduce(
  (total, section) =>
    total + section.bullets.filter((bullet) => bullet.status === "beta").length,
  0,
);

export const cyberNavItems: CyberNavItem[] = [
  { label: "WHY", href: "#why" },
  { label: "FLOW", href: "#flow" },
  { label: "FEATURES", href: "#features" },
  { label: "TRUST", href: "#system" },
  { label: "UPDATES", href: "/updates" },
];

export const cyberMetrics: CyberMetric[] = [
  { value: String(marketingFeatureSections.length), label: "Main areas" },
  { value: String(totalFeatureBullets), label: "Ways to work" },
  { value: String(liveBullets), label: "Ready now" },
  { value: String(betaBullets), label: "In beta" },
];

export const cyberRingConfig: OrbitRing[] = [
  {
    id: "inner",
    radius: 140,
    durationSeconds: 80,
    reverse: false,
    nodeSizeClassName: "h-14 w-14",
    nodes: [
      { id: "pos", label: "New sale", icon: ShoppingCart },
      { id: "inventory", label: "Products", icon: Boxes },
      { id: "customers", label: "Customers", icon: Users },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "security", label: "Security", icon: ShieldCheck },
      { id: "privacy", label: "Privacy", icon: Lock },
    ],
  },
  {
    id: "middle",
    radius: 250,
    durationSeconds: 120,
    reverse: true,
    nodeSizeClassName: "h-12 w-12",
    nodes: [
      { id: "quick-mode", label: "Fast sale", icon: Gauge },
      { id: "mobile", label: "Mobile", icon: Smartphone },
      { id: "multi-store", label: "Multi-Store", icon: Store },
      { id: "payments", label: "Payments", icon: CreditCard },
      { id: "discounts", label: "Discounts", icon: Tag },
      { id: "refunds", label: "Refunds", icon: Receipt },
      { id: "audit", label: "Audit", icon: Fingerprint },
      { id: "team-roles", label: "Team access", icon: Shield },
      { id: "reorder", label: "Reorder", icon: PackageSearch },
      { id: "crm", label: "Customers", icon: UserRoundSearch },
    ],
  },
  {
    id: "outer",
    radius: 360,
    durationSeconds: 160,
    reverse: false,
    nodeSizeClassName: "h-10 w-10",
    nodes: [
      { id: "barcode", label: "Barcode", icon: QrCode },
      { id: "scan", label: "Scan", icon: ScanLine },
      { id: "credit", label: "Store Accounts", icon: HandCoins },
      { id: "cash", label: "Money", icon: Landmark },
      { id: "lists", label: "Lists", icon: ListChecks },
      { id: "logs", label: "History", icon: FileSearch },
      { id: "layers", label: "Locations", icon: Layers2 },
      { id: "vault", label: "Protect details", icon: Vault },
      { id: "watch", label: "What changed", icon: Radar },
    ],
  },
];

export const cyberContrastSteps: ContrastStep[] = [
  {
    id: "step-1",
    title: "Add each sale fast",
    body: "Scan or search, take payment, and save the sale.",
  },
  {
    id: "step-2",
    title: "Keep stock counts current",
    body: "Saved sales update stock so you can see what’s left.",
  },
  {
    id: "step-3",
    title: "Keep customer history clear",
    body: "Details, notes, and sales stay together.",
  },
  {
    id: "step-4",
    title: "See who changed what",
    body: "History shows who made a supported change and when.",
  },
];

export const cyberHeroCopy = {
  eyebrow: "Customers, stock, sales, and money",
  heading: "Know what sold. See what’s left.",
  gradientEmphasis: "Keep the business straight in one place.",
  body: "DRX helps you track customers, products, sales, payments, and balances due.",
  highlights: ["Fast sales", "Clear stock", "Customer history", "Team access"],
  supportingLines: drxPositioning.punchlines.slice(0, 3),
  proofLine: whyDrxExists.close,
};

const curatedFeatureIds = [
  "fast-pos",
  "inventory",
  "customers",
  "team-control",
  "reports",
] as const;

export const cyberPrimaryFeatureCards = curatedFeatureIds
  .map((id) => marketingFeatureSections.find((section) => section.id === id))
  .filter((section): section is (typeof marketingFeatureSections)[number] =>
    Boolean(section),
  );

export const cyberFeaturePills = curatedFeatureIds
  .map(
    (id) =>
      marketingFeatureSections.find((section) => section.id === id)?.title,
  )
  .filter((title): title is string => Boolean(title));

export const cyberFooterColumns = [
  {
    title: "Product",
    links: [
      { label: "What DRX Does", href: "/product" },
      { label: "Use Cases", href: "/use-cases" },
      { label: "Beta", href: "/beta" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Guides", href: "/resources/guides" },
      { label: "Help Desk", href: docsHelpdeskUrl },
      { label: "Changelog", href: docsChangelogUrl },
      { label: "Roadmap", href: "/updates" },
      { label: "Legal Hub", href: "/legal" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Lawful Use", href: "/legal/lawful-use" },
    ],
  },
] as const;
