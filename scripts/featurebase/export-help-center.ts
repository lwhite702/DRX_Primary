import fs from "node:fs";
import path from "node:path";
import { writeJson } from "./_client";
import { inspectPublicHelpCenter } from "./_help-public.mjs";
import { exportHelpApi } from "./_help-api";

async function main() {
  const args = process.argv.slice(2);
  const directory =
    args.find((arg) => !arg.startsWith("--")) ?? ".featurebase/before-api";
  const manifest = JSON.parse(
    fs.readFileSync("docs/featurebase/help-center-manifest.json", "utf8"),
  );
  const snapshot = args.includes("--public")
    ? await inspectPublicHelpCenter()
    : await exportHelpApi(manifest);
  const output = path.resolve(
    directory,
    args.includes("--public") ? "public-snapshot.json" : "api-snapshot.json",
  );
  writeJson(output, snapshot);
  console.log(
    JSON.stringify({
      ok: true,
      method: snapshot.method,
      output,
      collections: snapshot.collections.length,
      articles: snapshot.articles.length,
      apiExportVerified: snapshot.method === "authenticated-api",
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
