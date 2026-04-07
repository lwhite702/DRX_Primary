import fs from "fs";
import path from "path";

function walk(dirPath: string, matcher: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath, matcher));
    } else if (matcher(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function toRoute(filePath: string): string {
  const normalized = filePath.split("/app/")[1]?.replace(/\/page\.tsx$/, "") ?? filePath;
  return `/${normalized.replace(/\(app\)\//g, "").replace(/\(operator\)\//g, "").replace(/index$/, "")}`;
}

async function main() {
  const appRoot = path.resolve(process.cwd(), "apps/app/app");
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/drx-feature-audit-auto.md",
  );
  const pageFiles = walk(appRoot, (file) => file.endsWith("/page.tsx"));
  const routeFiles = walk(appRoot, (file) => file.endsWith("/route.ts"));
  const lines = [
    "# DRX Feature Audit (Auto)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Page routes found: ${pageFiles.length}`,
    `API routes found: ${routeFiles.length}`,
    "",
    "## Page routes",
    ...pageFiles.sort().map((file) => `- ${toRoute(file)} (${file})`),
    "",
    "## API routes",
    ...routeFiles.sort().map((file) => `- ${file}`),
    "",
  ];
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, reportPath, pageRoutes: pageFiles.length, apiRoutes: routeFiles.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

