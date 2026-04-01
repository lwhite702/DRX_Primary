import { appWaitlistUrl } from "@/lib/app-links";

export const topNavLinks = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#demo", label: "Demo" },
  { href: "/#docs", label: "Docs" },
] as const;

export const headerCta = { href: appWaitlistUrl, label: "Join the Beta" } as const;

export const footerLinks = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
] as const;
