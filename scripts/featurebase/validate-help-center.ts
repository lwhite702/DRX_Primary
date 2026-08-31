import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { loadHelpContent, escapeHtml } from "./_help-content.mjs";
import { writeJson, writeText } from "./_client";

async function main() {
  const publication = process.argv.includes("--publication");
  if (publication)
    fs.rmSync(".featurebase/publication-validation.json", { force: true });
  const { manifest, articles, contentHash } = loadHelpContent();
  const links = [
    ...new Set(articles.flatMap((a: any) => a.links.map((l: any) => l.url))),
  ] as string[];
  const linkResults = [];
  for (const url of links) {
    if (url.startsWith("mailto:")) {
      if (url !== "mailto:support@deelrxcrm.com")
        throw new Error("Unapproved support address");
      linkResults.push({
        url,
        status: "matches-canonical-contact",
        deliveryTested: false,
      });
      continue;
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok)
      throw new Error(`Link failed (${response.status}): ${url}`);
    const expectedId = new URL(url).pathname.match(/\/articles\/(\d+)/)?.[1];
    const doc = new JSDOM(
      (await response.text()).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""),
    ).window.document;
    if (expectedId) {
      if (
        new URL(response.url).origin !== manifest.origin ||
        !new URL(response.url).pathname.startsWith(
          `/en/help/articles/${expectedId}`,
        ) ||
        !doc.querySelector("article .installation-content")
      )
        throw new Error(`Wrong link destination: ${url}`);
    }
    linkResults.push({ url, status: response.status, finalUrl: response.url });
  }
  // Verify all historical full-slug URLs too, not just new ID links.
  for (const article of articles) {
    const response = await fetch(article.publicUrl, {
      signal: AbortSignal.timeout(30000),
    });
    if (
      !response.ok ||
      !new URL(response.url).pathname.startsWith(
        `/en/help/articles/${article.id}`,
      )
    )
      throw new Error(`Historical URL failed: ${article.id}`);
  }
  for (const article of articles) {
    writeText(
      `.featurebase/preview/${article.id}.html`,
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(article.title)}</title><style>body{font:17px/1.6 system-ui;max-width:760px;margin:auto;padding:32px;color:#1f2937}h1,h2,h3{line-height:1.25}a{color:#2259b5}li{margin:8px 0}</style><body><article><header><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.description)}</p></header>${article.body}</article></body></html>`,
    );
  }
  const report: any = {
    ok: true,
    createdAt: new Date().toISOString(),
    contentHash,
    articles: articles.length,
    internalLinks: articles.reduce(
      (n: number, a: any) =>
        n +
        a.links.filter((l: any) => /\/en\/help\/articles\//.test(l.url)).length,
      0,
    ),
    links: linkResults,
    formatting:
      "strict Markdown subset and HTML DOM checked; Featurebase rendering still requires post-sync verification",
    publishReady: false,
  };
  writeJson(".featurebase/content-validation.json", report);
  if (publication) {
    const review = JSON.parse(
      fs.readFileSync("docs/featurebase/audit-review.json", "utf8"),
    );
    if (!review.completeApiAudit || review.unresolvedP1P2 !== 0)
      throw new Error(
        "Complete API and unpublished-content audit is still required",
      );
    const commands = [
      "featurebase:import:help-center:dry",
      "featurebase:reorder:help-center:dry",
      "docs:audit:features",
      "docs:audit:gaps",
      "copy:lint",
      "test:featurebase:help",
      "test:policy",
      "test:repo-hygiene",
      "release:integrity",
    ];
    report.commands = [];
    for (const command of commands) {
      const result = spawnSync("pnpm", [command], { encoding: "utf8" });
      writeText(
        path.join(".featurebase/checks", `${command.replaceAll(":", "-")}.log`),
        `${result.stdout ?? ""}${result.stderr ?? ""}`,
      );
      report.commands.push({
        command: `pnpm ${command}`,
        exitCode: result.status,
      });
      if (result.status !== 0)
        throw new Error(`Publication check failed: ${command}`);
    }
    report.publishReady = true;
    report.unresolvedP1P2 = 0;
    report.createdAt = new Date().toISOString();
    writeJson(".featurebase/publication-validation.json", report);
  }
  console.log(
    JSON.stringify({
      ok: true,
      articles: articles.length,
      links: linkResults.length,
      internalLinks: report.internalLinks,
      publishReady: report.publishReady,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
