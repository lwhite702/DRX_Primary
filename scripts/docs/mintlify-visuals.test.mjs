import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateMintlifyVisuals } from "./validate-mintlify-visuals.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("canonical Mintlify visuals pass without the retired article renderer", async () => {
  const result = await validateMintlifyVisuals(root);
  assert.equal(result.assets, 20);
  assert.equal(result.placements, 23);
});

for (const [name, mutate] of [
  ["checksum", (m) => { m.assets[0].sha256 = "0".repeat(64); }],
  ["dimensions", (m) => { m.assets[0].width++; }],
  ["duplicate", (m) => { m.assets[1].id = m.assets[0].id; }],
  ["path traversal", (m) => { m.assets[0].sourcePath = "app-docs/_assets/help-center/../../secret"; }],
  ["placement", (m) => { m.assets[0].articlePlacements[0].articleId = "0000000"; }],
]) {
  test(`rejects a corrupt visual ${name}`, async () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "drx-mintlify-visuals-"));
    try {
      fs.symlinkSync(path.join(root, "app-docs"), path.join(fixture, "app-docs"));
      fs.mkdirSync(path.join(fixture, "docs/featurebase"), { recursive: true });
      fs.mkdirSync(path.join(fixture, "docs/mintlify"), { recursive: true });
      const manifestPath = "docs/featurebase/help-center-visuals.json";
      const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), "utf8"));
      mutate(manifest);
      fs.writeFileSync(path.join(fixture, manifestPath), JSON.stringify(manifest));
      fs.copyFileSync(path.join(root, "docs/mintlify/generated-help-receipt.json"), path.join(fixture, "docs/mintlify/generated-help-receipt.json"));
      await assert.rejects(validateMintlifyVisuals(fixture));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
}
