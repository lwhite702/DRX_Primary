import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingUrl =
    process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://deelrxcrm.com";
  const now = new Date();

  const routes = [
    "/",
    "/beta",
    "/waitlist",
    "/product",
    "/product/sales-checkout",
    "/product/inventory-control",
    "/product/customers-credit",
    "/product/operations-visibility",
    "/product/team-access-security",
    "/resources",
    "/resources/mobile-testing",
    "/resources/changelog",
    "/resources/guides",
    "/resources/guides/credit-and-payments",
    "/resources/guides/inventory-intake-and-adjustments",
    "/resources/guides/privacy-presets-and-team-roles",
    "/use-cases",
    "/use-cases/owner-operator",
    "/use-cases/store-manager",
    "/use-cases/multi-role-teams",
    "/legal",
    "/legal/terms",
    "/legal/privacy",
    "/legal/lawful-use",
    "/legal/regulatory-disclaimer",
    "/privacy",
    "/terms",
  ];

  return routes.map((route) => ({
    url: `${marketingUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
