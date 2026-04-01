import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const marketingUrl =
    process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://deelrxcrm.com";

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${marketingUrl}/sitemap.xml`,
  };
}
