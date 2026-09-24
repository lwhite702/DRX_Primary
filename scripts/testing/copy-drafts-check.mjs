import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appStoreCopy } from "../../apps/marketing/lib/app-store-metadata.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(
  await readFile(path.join(repoRoot, "docs/featurebase/help-center-manifest.json"), "utf8"),
);
const draft = await readFile(
  path.join(repoRoot, "docs/content/provider-copy-templates.md"),
  "utf8",
);
const copyInventory = JSON.parse(
  await readFile(path.join(repoRoot, "docs/content/copy-inventory.json"), "utf8"),
);

for (const article of manifest.articles) {
  const sourcePath = path.join(repoRoot, article.sourcePath);
  const source = await readFile(sourcePath, "utf8");
  assert.doesNotMatch(source, /https:\/\/drx\.featurebase\.app/i, `${article.sourcePath} links to retired help`);

  for (const [, target] of source.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
    assert.ok(
      await readFile(path.resolve(path.dirname(sourcePath), target)).then(() => true, () => false),
      `${article.sourcePath} links to missing source ${target}`,
    );
  }
}

for (const required of [
  "## Help Center terminology and short answers",
  "## Email",
  "## Push",
  "## Support replies",
  "## App Store and Google Play listing lead",
  "These templates are drafts.",
  "Never put customer names, contact details, notes, balances, or product details on",
  "### Weekly numbers",
  "### Balance reminder",
  "### New sign-in",
  "### Delivery reminder",
  "### Product update",
  "- Low stock:",
  "- Balance due:",
  "- Weekly report:",
  "- Delivery:",
  "- Security:",
  "- Product update:",
]) {
  assert.ok(draft.includes(required), `provider draft is missing: ${required}`);
}

assert.equal(appStoreCopy.status, "blocked_pending_product_review");
assert.match(appStoreCopy.description, /New sale[\s\S]*Sales[\s\S]*Payments[\s\S]*Products[\s\S]*stock/i);
assert.doesNotMatch(
  `${appStoreCopy.subtitle} ${appStoreCopy.keywords} ${appStoreCopy.description}`,
  /\bPOS\b|\binventory\b|Orders & Receipts|Point of Sale|Store Credit/i,
);

const draftOnlyIds = [
  "help.canonical-terms",
  "email.weekly-numbers",
  "email.balance-reminder",
  "email.new-sign-in",
  "email.delivery-reminder",
  "email.product-update",
  "push.low-stock",
  "push.balance-due",
  "push.weekly-report",
  "push.delivery-reminder",
  "push.security",
  "push.product-update",
  "store.listing-lead",
  "google-play.listing-lead",
  "sales.one-liner",
  "support.reply-guidance",
];

for (const id of draftOnlyIds) {
  const entry = copyInventory.entries.find((item) => item.id === id);
  assert.ok(entry, `copy inventory is missing ${id}`);
  assert.equal(entry.reviewState, "draft", `${id} must remain draft-only`);
}

for (const entry of copyInventory.entries.filter((item) =>
  ["email", "push", "app-store", "google-play", "sales", "support"].includes(item.surface),
)) {
  assert.equal(entry.reviewState, "draft", `${entry.id} must remain draft-only`);
}

console.log(
  `Copy draft checks passed for ${manifest.articles.length} Help Center sources, ${draftOnlyIds.length} draft inventory entries, and blocked store metadata.`,
);
