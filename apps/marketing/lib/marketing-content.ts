import { drxAudience } from "@/lib/feature-canon";

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
    preheadline: "Built for people who actually run the business",
    headlineLead: "Keep the count right.",
    headlineAccent: "Keep the line moving.",
    subheadline:
      "Know what you have, what you sold, what you made, and who still owes you. No spreadsheet circus required.",
    proofLabels: drxAudience.proofLabels,
    primaryCta: { label: "Get Early Access", href: "/waitlist" },
    secondaryCta: { label: "See How It Works", href: "/#product" },
  } satisfies HeroContent,
  benefits: [
    {
      id: "checkout",
      title: "Keep the Line Moving",
      body: "Find the product, set the amount, take payment, done.",
    },
    {
      id: "inventory",
      title: "Keep the Count Right",
      body: "Know what you have, what moved, and what needs a reup.",
    },
    {
      id: "reporting",
      title: "Know Your Numbers",
      body: "See sales, profit, and low stock without digging through reports.",
    },
    {
      id: "access",
      title: "Keep Your Crew in Check",
      body: "Give people the access they need and keep a record of who did what.",
    },
  ] satisfies BenefitCard[],
  betaAccess: {
    title: "Keep the count right.",
    lead: "DRX is opening early access to operators who want a faster way to track stock, sales, and balances without the usual software nonsense.",
    cta: { label: "Get Early Access", href: "/waitlist" },
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
      { label: "Demo", href: "/#demo" },
      { label: "Resources", href: "/resources" },
    ],
    resourceLinks: [
      { label: "Getting Started", href: "/resources/guides" },
      { label: "Product Updates", href: "/resources/changelog" },
      { label: "Help", href: "/resources" },
    ],
    contact: "support@deelrxcrm.com",
    legalLinks: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Use", href: "/legal/terms" },
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
