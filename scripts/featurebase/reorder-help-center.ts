import { loadHelpContent } from "./_help-content.mjs";
import { inspectPublicHelpCenter } from "./_help-public.mjs";
import { writeJson } from "./_client";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--dry-run", "--publish"].includes(arg)))
    throw new Error("Unknown reorder argument");
  const { manifest } = loadHelpContent();
  const current = await inspectPublicHelpCenter();
  const shape = (value: any) =>
    JSON.stringify({
      collections: value.collections.map((c: any) => [
        c.id,
        c.name,
        c.publicOrder,
      ]),
      articles: value.articles.map((a: any) => [
        a.id,
        a.parentId,
        a.publicOrder,
      ]),
    });
  if (manifest.ordering !== "preserve" || shape(current) !== shape(manifest))
    throw new Error(
      "Order drift detected. The documented API cannot set order; no changes were made.",
    );
  const report = {
    ok: true,
    method: "public-html",
    action: "preserved-verified",
    updates: 0,
    apiWriteVerified: false,
    collections: current.collections.length,
    articles: current.articles.length,
  };
  writeJson(".featurebase/reorder-results.json", report);
  console.log(JSON.stringify(report));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
