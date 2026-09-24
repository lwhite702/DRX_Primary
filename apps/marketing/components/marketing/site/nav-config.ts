import { appWaitlistUrl } from "@/lib/app-links";

export const topNavLinks = [
  { href: "/", label: "Home" },
  { href: "/#product", label: "Product" },
  { href: "/resources", label: "Resources" },
] as const;

export const headerCta = { href: appWaitlistUrl, label: "Join the Beta" } as const;

export const footerLinks = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
] as const;
