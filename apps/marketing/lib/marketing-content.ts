import { drxAudience } from "./feature-canon";
import { drxContent } from "@deelrx/content";

export type HeroContent = {
  preheadline: string;
  headlineLead: string;
  headlineAccent: string;
  subheadline: string;
  proofLabels: readonly string[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export type BenefitCard = {
  id: "checkout" | "inventory" | "reporting" | "access";
  title: string;
  body: string;
};

export type BetaAccessSection = {
  title: string;
  lead: string;
  cta: { label: string; href: string };
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type FooterContent = {
  about: string;
  menuLinks: Array<{ label: string; href: string }>;
  resourceLinks: Array<{ label: string; href: string }>;
  contact: string;
  legalLinks: Array<{ label: string; href: string }>;
  socialLinks: Array<{ label: string; href: string }>;
  disclaimer: string;
};

export const marketingContent = {
  hero: {
    preheadline: "Customers, stock, sales, and money. Kept straight.",
    headlineLead: "Know what you sold.",
    headlineAccent: "See who still owes you.",
    subheadline: drxContent.brand.promise,
    proofLabels: drxAudience.proofLabels,
    primaryCta: { label: "Join early access", href: "/waitlist" },
    secondaryCta: { label: "See how it works", href: "/#product" },
  } satisfies HeroContent,
  benefits: [
    {
      id: "checkout",
      title: "Add a sale fast",
      body: "Find the product, set the amount, take payment, and you’re done.",
    },
    {
      id: "inventory",
      title: "Know what’s left",
      body: "See what came in, what went out, and what is running low.",
    },
    {
      id: "reporting",
      title: "Check your numbers",
      body: "See sales, totals, and low stock without digging around.",
    },
    {
      id: "access",
      title: "Choose who sees what",
      body: "Give each team member the access they need. Keep a history of changes.",
    },
  ] satisfies BenefitCard[],
  betaAccess: {
    title: "Keep the business straight.",
    lead: "DRX early access is for people who need a clear way to track customers, stock, sales, payments, and balances due.",
    cta: { label: "Join early access", href: "/waitlist" },
  } satisfies BetaAccessSection,
  faq: [
    {
      question: "What is Deelrx CRM?",
      answer:
        "Deelrx CRM, or DRX, helps you track sales, stock, customers, payments, and open balances in one place.",
    },
    {
      question: "Who is DRX for?",
      answer:
        "DRX is built for owner-operators and small crews who sell in person, carry stock, and need the count to stay right.",
    },
    {
      question: "What is a customer store account?",
      answer:
        "It is a record of what a customer bought, paid, and still owes your business. DRX records the balance. It is not a lender or payment network.",
    },
    {
      question: "Can I get the iPhone app now?",
      answer:
        "Not yet. We’ll announce iPhone early access after the current build is verified for TestFlight.",
    },
    {
      question: "Does DRX tell me what laws apply to my business?",
      answer:
        "No. DRX helps you keep your records straight. You are responsible for the rules that apply to your business.",
    },
  ] satisfies FaqItem[],
  footer: {
    about:
      "Deelrx CRM helps operators keep stock, sales, payments, and balances straight without complicated software.",
    menuLinks: [
      { label: "Home", href: "/" },
      { label: "Product", href: "/#product" },
      { label: "Resources", href: "/resources" },
    ],
    resourceLinks: [
      { label: "Getting Started", href: "/resources/guides" },
      { label: "Product Updates", href: "/updates" },
      { label: "Help & Support", href: "https://docs.deelrxcrm.com/start/help-and-support" },
      { label: "Resources", href: "/resources" },
    ],
    contact: "support@deelrxcrm.com",
    legalLinks: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Lawful Use", href: "/legal/lawful-use" },
      { label: "Regulatory Disclaimer", href: "/legal/regulatory-disclaimer" },
      { label: "Beta Terms", href: "/beta" },
      { label: "SMS Consent", href: "/sms-consent" },
    ],
    socialLinks: [
      { label: "Twitter / X", href: "https://x.com" },
      { label: "Instagram", href: "https://instagram.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
    ],
    disclaimer:
      "Deelrx CRM is built for lawful business use. You are responsible for following the laws and rules that apply to your business.",
  } satisfies FooterContent,
} as const;
