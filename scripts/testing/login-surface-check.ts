import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

type Check = { file: string; tokens: string[] };

const checks: Check[] = [
  {
    file: "apps/app/app/login/[[...rest]]/page.tsx",
    tokens: ["Sign In", "SignIn", "export const metadata"],
  },
  {
    file: "apps/app/app/register/[[...rest]]/page.tsx",
    tokens: ["SignUp", "export const metadata"],
  },
  {
    file: "apps/marketing/app/login/page.tsx",
    tokens: ["redirect(", "appUrl", "metadata"],
  },
  {
    file: "apps/mobile/app/login.tsx",
    tokens: ["accessibilityRole=\"button\"", "accessibilityLabel=\"Authenticate\"", "testID=\"login-button\""],
  },
  {
    file: "apps/app/lib/auth/route-classification.ts",
    tokens: ["/login", "/register", "/sign-in", "/sign-up"],
  },
  {
    file: "apps/app/middleware.ts",
    tokens: ["isAuthEntryPath", "redirectToApp(req, \"/login\", true)"],
  },
];

function fail(message: string): never {
  console.error(`Login surface check failed: ${message}`);
  process.exit(1);
}

function main() {
  for (const check of checks) {
    const abs = path.join(root, check.file);
    if (!fs.existsSync(abs)) fail(`Missing required surface file: ${check.file}`);
    const text = fs.readFileSync(abs, "utf8");
    for (const token of check.tokens) {
      if (!text.includes(token)) {
        fail(`Missing token '${token}' in ${check.file}`);
      }
    }
  }

  const appPkg = JSON.parse(
    fs.readFileSync(path.join(root, "apps/app/package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };

  if (!appPkg.scripts?.["test:e2e:required"]) {
    fail("apps/app/package.json missing test:e2e:required");
  }
  if (!appPkg.scripts?.["test:e2e:auth"]) {
    fail("apps/app/package.json missing test:e2e:auth");
  }

  console.log("Login surface check passed.");
}

main();
