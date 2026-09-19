import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingUrl =
    process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://deelrxcrm.com";
  const now = new Date();

  const routes: Array<{ path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }> = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/product", changeFrequency: "weekly", priority: 0.9 },
    { path: "/product/sales-checkout", changeFrequency: "weekly", priority: 0.8 },
    { path: "/product/inventory-control", changeFrequency: "weekly", priority: 0.8 },
    { path: "/product/customers-credit", changeFrequency: "weekly", priority: 0.8 },
    { path: "/product/operations-visibility", changeFrequency: "weekly", priority: 0.8 },
    { path: "/product/team-access-security", changeFrequency: "weekly", priority: 0.8 },
    { path: "/use-cases", changeFrequency: "weekly", priority: 0.8 },
    { path: "/use-cases/owner-operator", changeFrequency: "weekly", priority: 0.7 },
    { path: "/use-cases/store-manager", changeFrequency: "weekly", priority: 0.7 },
    { path: "/use-cases/multi-role-teams", changeFrequency: "weekly", priority: 0.7 },
    { path: "/updates", changeFrequency: "daily", priority: 0.8 },
    { path: "/resources", changeFrequency: "weekly", priority: 0.7 },
    { path: "/resources/guides", changeFrequency: "weekly", priority: 0.7 },
    { path: "/resources/guides/credit-and-payments", changeFrequency: "weekly", priority: 0.6 },
    { path: "/resources/guides/inventory-intake-and-adjustments", changeFrequency: "weekly", priority: 0.6 },
    { path: "/resources/guides/privacy-presets-and-team-roles", changeFrequency: "weekly", priority: 0.6 },
    { path: "/legal", changeFrequency: "monthly", priority: 0.6 },
    { path: "/legal/privacy", changeFrequency: "monthly", priority: 0.6 },
    { path: "/legal/terms", changeFrequency: "monthly", priority: 0.6 },
    { path: "/legal/lawful-use", changeFrequency: "monthly", priority: 0.5 },
    { path: "/legal/regulatory-disclaimer", changeFrequency: "monthly", priority: 0.5 },
    { path: "/sms-consent", changeFrequency: "monthly", priority: 0.6 },
    { path: "/beta", changeFrequency: "weekly", priority: 0.7 },
    { path: "/waitlist", changeFrequency: "weekly", priority: 0.8 },
  ];

  return routes.map((route) => ({
    url: `${marketingUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
