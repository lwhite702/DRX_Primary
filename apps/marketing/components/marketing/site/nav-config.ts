import { appWaitlistUrl } from "@/lib/app-links";
import {
  featurebaseHelpdeskUrl,
} from "@/lib/featurebase-links";

export const topNavLinks = [
  { href: "/product", label: "Product" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/resources", label: "Resources" },
  { href: "/beta", label: "Beta" },
  { href: "/legal", label: "Legal" },
  { href: appWaitlistUrl, label: "Waitlist" },
] as const;

export const footerLinks = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/lawful-use", label: "Lawful Use" },
  { href: "/legal/regulatory-disclaimer", label: "Regulatory Disclaimer" },
  { href: featurebaseHelpdeskUrl, label: "Help Desk" },
  { href: "/updates/changelog", label: "Changelog" },
  { href: "/updates/roadmap", label: "Roadmap" },
] as const;
