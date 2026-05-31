import path from "path";
import { fbRequest, type FbList, writeJson } from "./_client";

type Collection = { id: string; name: string; order: number | null };
type Article = { id: string; title: string; parentId: string; order: number | null };

const collectionOrder = [
  "Getting Started",
  "Dashboard",
  "Quick POS",
  "Sales",
  "Inventory",
  "Customers",
  "Front / Balances",
  "Reports",
  "Roles and Permissions",
  "Privacy and Security",
  "Settings",
  "Troubleshooting",
  "DRX Intelligence",
  "Admin Tools",
];

const articleOrderByCollection: Record<string, string[]> = {
  "Getting Started": [
    "Getting Started: Your First Week in DRX",
    "Workspaces and Tenant Context",
  ],
  Dashboard: ["Dashboard: Daily Check in 2 Minutes"],
  "Quick POS": ["Quick POS: Run a Sale Fast"],
  Sales: ["Sales History and Receipt Checks"],
  Inventory: [
    "Inventory: Manage Stock Without Guessing",
    "Inventory Audit: Fix Count Problems Fast",
  ],
  Customers: ["Customers: Profiles and History"],
  "Front / Balances": ["Front / Balances: Credit and Payment Workflow"],
  Reports: ["Reports and Operations Insights"],
  "Roles and Permissions": ["Roles and Permissions: Keep Access Tight"],
  "Privacy and Security": ["Privacy and Security: Daily Controls + RTBF"],
  Settings: ["Settings and Aliases: Keep Workflows Clean"],
  Troubleshooting: ["Troubleshooting: Fast Fixes First"],
  "DRX Intelligence": ["DRX Intelligence: Using AI Support Features"],
  "Admin Tools": ["Admin Tools Overview"],
};

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/reorder-help-center-results.json",
  );

  const collections = await fbRequest<FbList<Collection>>(
    "GET",
    "/help_center/collections?limit=100",
  );
  const articles = await fbRequest<FbList<Article>>(
    "GET",
    "/help_center/articles?state=all&limit=100",
  );

  const collectionByName = new Map(collections.data.map((c) => [c.name, c]));
  const articleByTitle = new Map(articles.data.map((a) => [a.title, a]));
  const report: Array<Record<string, string | number | boolean | null>> = [];

  for (let idx = 0; idx < collectionOrder.length; idx += 1) {
    const name = collectionOrder[idx];
    const targetOrder = idx + 1;
    const collection = collectionByName.get(name);
    if (!collection) {
      report.push({
        type: "collection",
        name,
        action: "skipped",
        reason: "not-found",
      });
      continue;
    }

    report.push({
      type: "collection",
      id: collection.id,
      name,
      action: dryRun ? "would-skip" : "skipped",
      reason: "api-does-not-accept-order-field",
      currentOrder: collection.order,
      targetOrder,
    });
  }

  for (const [collectionName, titles] of Object.entries(articleOrderByCollection)) {
    const collection = collectionByName.get(collectionName);
    if (!collection) continue;

    for (let idx = 0; idx < titles.length; idx += 1) {
      const title = titles[idx];
      const targetOrder = idx + 1;
      const article = articleByTitle.get(title);
      if (!article) {
        report.push({
          type: "article",
          title,
          collection: collectionName,
          action: "skipped",
          reason: "not-found",
        });
        continue;
      }

      if (dryRun) {
        report.push({
          type: "article",
          id: article.id,
          title,
          collection: collectionName,
          action: "would-update",
          currentParentId: article.parentId,
          targetParentId: collection.id,
          currentOrder: article.order,
          targetOrder,
        });
      } else {
        if (article.parentId !== collection.id) {
          await fbRequest("PATCH", `/help_center/articles/${article.id}`, {
            parentId: collection.id,
          });
        }
        report.push({
          type: "article",
          id: article.id,
          title,
          collection: collectionName,
          action: article.parentId === collection.id ? "checked" : "updated-parent",
          currentParentId: article.parentId,
          targetParentId: collection.id,
          currentOrder: article.order,
          targetOrder,
          note: "api-does-not-accept-order-field",
        });
      }
    }
  }

  writeJson(reportPath, report);
  console.log(
    JSON.stringify(
      { ok: true, dryRun, reportPath, updatesPlanned: report.length },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
