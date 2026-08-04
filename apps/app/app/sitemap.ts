import type { MetadataRoute } from "next";

const BUILD_LAST_MODIFIED = new Date(
  process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ?? Date.now(),
);

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.deelrxcrm.app";

  const routes = [
    "/",
    "/waitlist",
    "/privacy",
    "/privacy-policy",
    "/terms",
    "/legal/privacy",
    "/legal/terms",
    "/support",
  ];

  return routes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: BUILD_LAST_MODIFIED,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
