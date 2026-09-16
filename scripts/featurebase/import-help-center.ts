import fs from "node:fs";
import { fbRequest, writeJson } from "./_client";
import { loadHelpContent, contentFingerprint } from "./_help-content.mjs";
import {
  exportHelpApi,
  apiFingerprint,
  checkManagedSet,
  checkPublicBaseline,
} from "./_help-api";
import { inspectPublicHelpCenter } from "./_help-public.mjs";

const reportPath = ".featurebase/import-results.json";
async function main() {
  const args = new Set(process.argv.slice(2));
  if (
    [...args].some((a) => !["--publish", "--dry-run"].includes(a)) ||
    (args.has("--publish") && args.has("--dry-run"))
  )
    throw new Error("Use --dry-run (default) or --publish");
  const publish = args.has("--publish");
  if (!publish) fs.rmSync(".featurebase/import-dry-run.json", { force: true });
  const content = loadHelpContent(process.cwd(), {
    requirePublishedVisuals: true,
  });
  const before = await exportHelpApi(content.manifest);
  writeJson(".featurebase/before-api/api-snapshot.json", before);
  checkManagedSet(before, content.manifest);
  const publicBefore = await inspectPublicHelpCenter();
  checkPublicBaseline(publicBefore, content);
  writeJson(".featurebase/before-api/public-snapshot.json", publicBefore);
  const changes = content.articles.map((a: any) => {
    const old = before.articles.find((b: any) => b.id === a.id);
    return {
      id: a.id,
      title: a.title,
      action:
        contentFingerprint(old) === contentFingerprint(a)
          ? "unchanged"
          : "update",
    };
  });
  const plan = {
    ok: true,
    method: "authenticated-api",
    createdAt: new Date().toISOString(),
    contentHash: content.contentHash,
    baselineHash: apiFingerprint(before),
    changes,
  };
  if (!publish) {
    writeJson(".featurebase/import-dry-run.json", plan);
    console.log(JSON.stringify({ ...plan, published: false }));
    return;
  }
  const dry = JSON.parse(
    fs.readFileSync(".featurebase/import-dry-run.json", "utf8"),
  );
  const validation = JSON.parse(
    fs.readFileSync(".featurebase/publication-validation.json", "utf8"),
  );
  if (
    !dry.ok ||
    dry.method !== "authenticated-api" ||
    dry.contentHash !== plan.contentHash ||
    dry.baselineHash !== plan.baselineHash ||
    Date.now() - Date.parse(dry.createdAt) > 3600000
  )
    throw new Error("Clean matching API dry run within one hour required");
  if (
    !validation.publishReady ||
    validation.contentHash !== plan.contentHash ||
    validation.unresolvedP1P2 !== 0 ||
    Date.now() - Date.parse(validation.createdAt) > 3600000
  )
    throw new Error("Complete current publication validation required");
  const results: any[] = [];
  writeJson(reportPath, { ok: false, status: "started", results });
  try {
    for (const item of changes) {
      if (item.action === "unchanged") {
        results.push(item);
        continue;
      }
      const article = content.articles.find((a: any) => a.id === item.id);
      const old = before.articles.find((a: any) => a.id === item.id);
      const current: any = await fbRequest(
        "GET",
        `/help_center/articles/${item.id}?state=live`,
      );
      if (
        apiFingerprint({
          helpCenterId: before.helpCenterId,
          collections: [],
          articles: [current],
        }) !==
        apiFingerprint({
          helpCenterId: before.helpCenterId,
          collections: [],
          articles: [old],
        })
      )
        throw new Error(`Concurrent article change: ${item.id}`);
      // PATCH only editorial fields. IDs, parents, slugs, authors, icons and order stay untouched.
      await fbRequest("PATCH", `/help_center/articles/${item.id}`, {
        title: article.title,
        description: article.description,
        body: article.body,
        formatter: "raw",
        state: "live",
      });
      results.push({ ...item, status: "written-unverified" });
      writeJson(reportPath, { ok: false, status: "in-progress", results });
      const saved: any = await fbRequest(
        "GET",
        `/help_center/articles/${item.id}?state=live`,
      );
      if (
        contentFingerprint(saved) !== contentFingerprint(article) ||
        saved.slug !== old.slug ||
        saved.parentId !== old.parentId ||
        saved.order !== old.order ||
        saved.isDraftDiffersFromLive
      )
        throw new Error(`Published article differs: ${item.id}`);
      results.at(-1).status = "api-verified";
    }
    const after = await exportHelpApi(content.manifest);
    writeJson(".featurebase/after-api/api-snapshot.json", after);
    checkManagedSet(after, content.manifest);
    const publicAfter = await inspectPublicHelpCenter();
    writeJson(".featurebase/after/public-snapshot.json", publicAfter);
    if (publicAfter.articles.length !== content.articles.length)
      throw new Error("Public article count differs");
    for (const article of content.articles) {
      const saved = publicAfter.articles.find((a: any) => a.id === article.id);
      if (
        !saved ||
        contentFingerprint(saved) !== contentFingerprint(article) ||
        saved.slug !== article.publicSlug ||
        saved.publicOrder !== article.publicOrder ||
        saved.parentId !== article.parentId
      )
        throw new Error(`Public verification mismatch: ${article.id}`);
    }
    if (
      JSON.stringify(
        publicAfter.collections.map((c: any) => [c.id, c.name, c.publicOrder]),
      ) !==
      JSON.stringify(
        content.manifest.collections.map((c: any) => [
          c.id,
          c.name,
          c.publicOrder,
        ]),
      )
    )
      throw new Error("Collection order or names changed");
    writeJson(reportPath, {
      ok: true,
      status: "published-and-reexport-verified",
      contentHash: content.contentHash,
      results,
    });
    console.log(
      JSON.stringify({
        ok: true,
        published: true,
        reportPath,
        count: results.length,
      }),
    );
  } catch (error: any) {
    writeJson(reportPath, {
      ok: false,
      status: "stopped-review-required",
      error: error.message,
      results,
    });
    throw error;
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
