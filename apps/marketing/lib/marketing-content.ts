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
    preheadline: drxAudience.eyebrow,
    headlineLead: drxAudience.headlineLead,
    headlineAccent: drxAudience.headlineAccent,
    subheadline: drxAudience.supportingPromise,
    proofLabels: drxAudience.proofLabels,
    primaryCta: { label: "Join the Beta", href: "/waitlist" },
    secondaryCta: { label: "See Deelrx in Action", href: "/#product" },
  } satisfies HeroContent,
  benefits: [
    {
      id: "checkout",
      title: "Keep the Line Moving",
      body: "Search, scan, adjust, and finish checkout in one focused flow.",
    },
    {
      id: "inventory",
      title: "Know What's on Deck",
      body: "See what sold, what is on hand, and what is running low.",
    },
    {
      id: "reporting",
      title: "See the Shift Clearly",
      body: "Review sales, best sellers, and low-stock signals without reporting theater.",
    },
    {
      id: "access",
      title: "Control Team Access",
      body: "Give each operator the tools their role requires and keep sensitive actions attributable.",
    },
  ] satisfies BenefitCard[],
  betaAccess: {
    title: "Run the operation tighter.",
    lead: "We are opening Deelrx CRM beta access to a focused group of operators who want speed, clarity, and control.",
    cta: { label: "Join the Beta", href: "/waitlist" },
  } satisfies BetaAccessSection,
  faq: [
    {
      question: "What is Deelrx CRM (DRX)?",
      answer:
        "Deelrx CRM, also known as DRX, helps independent retailers track sales, inventory, customer records, and team access in one place.",
    },
    {
      question: "Who is DRX built for?",
      answer:
        "Independent retailers, owner-operated shops, pop-ups, and service businesses that carry inventory and need the floor to keep moving.",
    },
    {
      question: "What is a customer store account?",
      answer:
        "It is an optional merchant record for purchases, payments, and account balances. DRX does not present itself as a lender, payment network, or debt collector.",
    },
    {
      question: "Is the beta available through the public App Store?",
      answer:
        "Beta access uses the waitlist and TestFlight. Public App Store copy is reserved for a complete release that matches the submitted app.",
    },
    {
      question: "Does DRX provide legal or compliance advice?",
      answer:
        "No. DRX supports business operations. Each business remains responsible for its laws, licenses, taxes, reporting, and customer account policies.",
    },
  ] satisfies FaqItem[],
  footer: {
    about:
      "Deelrx CRM (DRX) is built for independent retailers who want speed, clarity, and control without complicated tools.",
    menuLinks: [
      { label: "Home", href: "/" },
      { label: "Product", href: "/#product" },
      { label: "Demo", href: "/#demo" },
      { label: "Resources", href: "/resources" },
    ],
    resourceLinks: [
      { label: "Getting Started", href: "/resources/guides" },
      { label: "Product Updates", href: "/resources/changelog" },
      { label: "Support Center", href: "/resources" },
    ],
    contact: "support@deelrxcrm.com",
    legalLinks: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
    ],
    socialLinks: [
      { label: "Twitter / X", href: "https://x.com" },
      { label: "Instagram", href: "https://instagram.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
    ],
    disclaimer:
      "Deelrx CRM (DRX) is intended for use by lawful businesses and operators. Users are responsible for complying with all applicable laws and regulations. Deelrx CRM does not support or condone illegal activity.",
  } satisfies FooterContent,
} as const;
