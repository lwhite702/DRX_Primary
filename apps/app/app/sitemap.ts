import type { MetadataRoute } from "next";

const configuredBuildDate = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP?.trim();
const parsedBuildDate = configuredBuildDate ? new Date(configuredBuildDate) : new Date();
const BUILD_LAST_MODIFIED = Number.isFinite(parsedBuildDate.getTime())
  ? parsedBuildDate
  : new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";

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
    lastModified: BUILD_LAST_MODIFIED,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
