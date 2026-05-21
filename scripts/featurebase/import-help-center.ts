import fs from "fs";
import path from "path";
import { fbRequest, type FbList, writeJson } from "./_client";

type Collection = { id: string; name: string };
type Article = { id: string; title: string };

const fileToCategory: Record<string, string> = {
  "getting-started-first-week.md": "Getting Started",
  "dashboard-daily-check.md": "Dashboard",
  "quick-pos-run-sale.md": "Quick POS",
  "sales-history-receipts.md": "Sales",
  "inventory-manage-stock.md": "Inventory",
  "inventory-audit-fixes.md": "Inventory",
  "customers-profiles-history.md": "Customers",
  "credit-balances-payments.md": "Front / Balances",
  "reports-and-insights.md": "Reports",
  "roles-permissions-staff-access.md": "Roles and Permissions",
  "settings-and-aliases.md": "Settings",
  "privacy-security-rtbf.md": "Privacy and Security",
  "drx-intelligence.md": "DRX Intelligence",
  "workspaces-and-tenants.md": "Getting Started",
  "troubleshooting-fast-fixes.md": "Troubleshooting",
  "admin-tools-overview.md": "Admin Tools",
};

function parseMd(filePath: string): { title: string; description: string; body: string } {
  const md = fs.readFileSync(filePath, "utf8");
  const title = md.split("\n").find((line) => line.startsWith("# "))?.replace(/^#\s+/, "").trim() ?? "Untitled";
  const description =
    md
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? "DRX help article.";
  const body = md
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      return `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
    })
    .join("\n");
  return { title, description, body };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const finalDir = path.resolve(process.cwd(), "docs/help-center-export/final");
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/import-help-center-results.json",
  );

  const collections = await fbRequest<FbList<Collection>>(
    "GET",
    "/help_center/collections?limit=100",
  );
  const articles = await fbRequest<FbList<Article>>(
    "GET",
    "/help_center/articles?state=all&limit=100",
  );

  const collectionByName = new Map(collections.data.map((c) => [c.name, c.id]));
  const articleByTitle = new Map(articles.data.map((a) => [a.title, a.id]));
  const report: Array<Record<string, string>> = [];

  for (const fileName of fs.readdirSync(finalDir).filter((file) => file.endsWith(".md"))) {
    const category = fileToCategory[fileName] ?? "Getting Started";
    const categoryId = collectionByName.get(category);
    const filePath = path.join(finalDir, fileName);
    const parsed = parseMd(filePath);

    if (!categoryId) {
      if (dryRun) {
        report.push({ file: fileName, title: parsed.title, action: "would-fail", reason: `missing-category:${category}` });
        continue;
      }
      const created = await fbRequest<{ id: string }>("POST", "/help_center/collections", {
        name: category,
        description: `${category} articles`,
      });
      collectionByName.set(category, created.id);
    }

    const parentId = collectionByName.get(category) as string;
    const existingId = articleByTitle.get(parsed.title);
    const payload = {
      title: parsed.title,
      description: parsed.description,
      body: parsed.body,
      parentId,
      state: "live",
    };

    if (dryRun) {
      report.push({
        file: fileName,
        title: parsed.title,
        action: existingId ? "would-update" : "would-create",
        parentId,
      });
      continue;
    }

    if (existingId) {
      await fbRequest("PATCH", `/help_center/articles/${existingId}`, payload);
      report.push({ file: fileName, title: parsed.title, action: "updated", id: existingId });
    } else {
      const created = await fbRequest<{ id: string }>("POST", "/help_center/articles", payload);
      report.push({ file: fileName, title: parsed.title, action: "created", id: created.id });
    }
  }

  writeJson(reportPath, report);
  console.log(JSON.stringify({ ok: true, dryRun, reportPath, count: report.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

