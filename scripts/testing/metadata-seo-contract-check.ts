import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message: string): never {
  console.error(`Metadata/SEO contract check failed: ${message}`);
  process.exit(1);
}

function read(rel: string): string {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail(`Missing file: ${rel}`);
  return fs.readFileSync(abs, "utf8");
}

function requireTokens(rel: string, tokens: string[]) {
  const text = read(rel);
  for (const token of tokens) {
    if (!text.includes(token)) {
      fail(`Missing token '${token}' in ${rel}`);
    }
  }
}

function main() {
  requireTokens("apps/app/app/layout.tsx", ["metadataBase", "alternates", "canonical", "openGraph", "twitter"]);
  requireTokens("apps/marketing/app/layout.tsx", ["metadataBase", "alternates", "canonical", "openGraph", "twitter"]);

  requireTokens("apps/app/app/robots.ts", ["sitemap", "disallow"]);
  requireTokens("apps/app/app/sitemap.ts", ["MetadataRoute.Sitemap", "url:"]);
  requireTokens("apps/marketing/app/robots.ts", ["sitemap"]);
  requireTokens("apps/marketing/app/sitemap.ts", ["MetadataRoute.Sitemap", "url:"]);

  requireTokens("apps/app/app/login/[[...rest]]/page.tsx", ["export const metadata", "title:", "description:"]);
  requireTokens("apps/app/app/register/[[...rest]]/page.tsx", ["export const metadata", "title:", "description:"]);
  requireTokens("apps/marketing/app/login/page.tsx", ["export const metadata", "robots", "canonical"]);

  const appRobots = read("apps/app/app/robots.ts");
  if (!appRobots.includes("deelrxcrm.app")) {
    fail("App robots sitemap domain must target deelrxcrm.app");
  }

  const marketingRobots = read("apps/marketing/app/robots.ts");
  if (!marketingRobots.includes("deelrxcrm.com")) {
    fail("Marketing robots sitemap domain must target deelrxcrm.com");
  }

  console.log("Metadata/SEO contract check passed.");
}

main();
