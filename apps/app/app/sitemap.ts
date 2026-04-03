import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";
  const now = new Date();

  const routes = [
    "/",
    "/waitlist",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
  ];

  return routes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
