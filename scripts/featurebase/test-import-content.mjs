#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCustomerChangelog, parseMode, parseRoadmap } from "./_import-content.mjs";

const root = process.cwd();
const roadmap = parseRoadmap(readFileSync(join(root, "docs/help-center-export/roadmap/customer-roadmap.md"), "utf8"));
assert.ok(roadmap.some((item) => item.title === "Now: 0.6.0 mobile commerce and delivery fulfillment"));
assert.equal(new Set(roadmap.map((item) => item.stableId)).size, roadmap.length);
assert.equal(
  parseRoadmap("## Now\n\n- **Move-safe item** (`planned`)\n  Text.")[0].stableId,
  parseRoadmap("## Next\n\n- **Move-safe item** (`planned`)\n  Text.")[0].stableId,
);

const changelog = parseCustomerChangelog(readFileSync(join(root, "docs/help-center-export/changelog/customer-changelog.md"), "utf8"));
assert.ok(changelog.length > 0);
assert.equal(new Set(changelog.map((item) => item.stableId)).size, changelog.length);
assert.equal(changelog.some((item) => item.version.includes("rc")), false);

assert.deepEqual(parseMode([]), { dryRun: true, publish: false });
assert.deepEqual(parseMode(["--dry-run"]), { dryRun: true, publish: false });
assert.deepEqual(parseMode(["--publish"]), { dryRun: false, publish: true });
assert.throws(() => parseMode(["--dry-run", "--publish"]));

console.log(`Featurebase projection fixtures passed (${roadmap.length} roadmap, ${changelog.length} changelog entries; dry-run default).`);
