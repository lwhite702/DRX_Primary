import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/waitlist", "/privacy", "/terms"],
        disallow: ["/admin", "/control", "/api", "/dashboard", "/settings", "/customers", "/inventory", "/sales", "/login", "/register"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
