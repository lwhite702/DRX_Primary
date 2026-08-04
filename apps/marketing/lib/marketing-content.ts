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
    preheadline: "Simple. Fast. Clear.",
    headline: "Built for people who actually run product.",
    subheadline:
      "Deelrx CRM (DRX) keeps your sales, inventory, and customers tight in one place. No spreadsheets, no guessing, no slowdown.",
    primaryCta: { label: "Join the Beta", href: "/waitlist" },
    secondaryCta: { label: "See How It Works", href: "/#how-it-works" },
  } satisfies HeroContent,
  benefits: [
    {
      title: "Move Faster",
      body: "Handle sales in seconds. No extra steps, no waiting around.",
    },
    {
      title: "Always Know What You Have",
      body: "See what's selling, what's low, and what's just sitting. All updated automatically.",
    },
    {
      title: "DRX Intelligence Has Your Back",
      body: "Get simple insights on what's making money and what needs attention so you can make better moves.",
    },
  ] satisfies BenefitCard[],
  howItWorks: [
    {
      title: "Add What You Sell",
      body: "Put in your items, prices, and amounts. DRX organizes everything for you.",
      cta: { label: "Join the Beta", href: "/waitlist" },
    },
    {
      title: "Make the Sale",
      body: "Log each sale quickly. Your numbers and stock update instantly.",
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
      "All features unlocked",
      "No payment required during beta",
      "Early say in how the product evolves",
    ],
    whoItsFor: [
      "Independent sellers",
      "Small operators",
      "Anyone tired of tracking everything manually",
    ],
    limitedSpots:
      "We're letting in a small group at a time to keep things running smooth. Once it fills up, access closes.",
    cta: { label: "Request Access", href: "/waitlist" },
  } satisfies BetaAccessSection,
  faq: [
    {
      question: "What is Deelrx CRM (DRX)?",
      answer:
        "Deelrx CRM (pronounced \"Dealers\") is a system that helps you track sales, inventory, and customers in one place.",
    },
    {
      question: "What is DRX Intelligence?",
      answer:
        "It's the smart layer that shows you what's selling, what's making money, and what needs attention.",
    },
    {
      question: "Is it hard to use?",
      answer: "No. It's built to be simple. You'll understand it within minutes.",
    },
    {
      question: "Do I have to pay?",
      answer: "No. During beta, access is free once you're approved.",
    },
    {
      question: "What happens after beta?",
      answer:
        "You'll get early user benefits and priority access when pricing is introduced.",
    },
  ] satisfies FaqItem[],
  footer: {
    about:
      "Deelrx CRM (DRX) is built for independent operators who want speed, clarity, and control without complicated tools.",
    menuLinks: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/#features" },
      { label: "Demo", href: "/#demo" },
      { label: "Docs", href: "/#docs" },
    ],
    resourceLinks: [
      { label: "Getting Started", href: "/resources/guides" },
      { label: "Product Updates", href: "/resources/changelog" },
      { label: "Support Center", href: "/support" },
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
