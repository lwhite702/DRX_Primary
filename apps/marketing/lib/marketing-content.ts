export type HeroContent = {
  preheadline: string;
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export type BenefitCard = {
  title: string;
  body: string;
};

export type HowItWorksStep = {
  title: string;
  body: string;
  cta: { label: string; href: string };
};

export type BetaAccessSection = {
  title: string;
  lead: string;
  whatYouGet: string[];
  whoItsFor: string[];
  limitedSpots: string;
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
    preheadline: "Built for independent retail.",
    headline: "For the ones who run it, not the ones who talk about it.",
    subheadline:
      "Fast checkout, tighter inventory, clear sales records, and role-based control for independent shops that move fast.",
    primaryCta: { label: "Join the Beta", href: "/waitlist" },
    secondaryCta: { label: "See How It Works", href: "/#how-it-works" },
  } satisfies HeroContent,
  benefits: [
    {
      title: "Keep the Line Moving",
      body: "Search, scan, adjust, and finish checkout in one focused flow.",
    },
    {
      title: "Know What's on Deck",
      body: "See what sold, what is on hand, and what is running low.",
    },
    {
      title: "See the Shift Clearly",
      body: "Review sales, best sellers, and low-stock signals without reporting theater.",
    },
  ] satisfies BenefitCard[],
  howItWorks: [
    {
      title: "Add What You Sell",
      body: "Add products, prices, stock levels, SKUs, and barcodes to one working catalog.",
      cta: { label: "Join the Beta", href: "/waitlist" },
    },
    {
      title: "Make the Sale",
      body: "Complete checkout and review the resulting sale and stock activity.",
      cta: { label: "Watch Demo", href: "/#demo" },
    },
    {
      title: "Stay in Control",
      body: "See what's working, what's not, and adjust on the fly.",
      cta: { label: "Get Early Access", href: "/waitlist" },
    },
  ] satisfies HowItWorksStep[],
  betaAccess: {
    title: "Get in early. Stay ahead.",
    lead: "We are opening Deelrx CRM beta access to a focused group of operators who want speed, clarity, and control.",
    whatYouGet: [
      "Full access to Deelrx CRM (DRX) during beta",
      "Access to current beta workflows",
      "No payment required during beta",
      "Early say in how the product evolves",
    ],
    whoItsFor: [
      "Independent retailers",
      "Owner-operated shops and pop-ups",
      "Service businesses that carry inventory",
    ],
    limitedSpots:
      "Access is added in small groups so product feedback and support stay manageable.",
    cta: { label: "Request Access", href: "/waitlist" },
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
