import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  renderArticle,
  loadHelpContent,
  contentFingerprint,
} from "./_help-content.mjs";
const md = (body) =>
  `---\ntitle: "Guide"\ndescription: "A short description."\n---\n\n${body}\n`;

test("renders real steps, emphasis and links without leaving Markdown in paragraphs", () => {
  const a = renderArticle(
    md(
      "## Do this\n\n1. Choose **Save**.\n2. Read [Help](https://drx.featurebase.app).\n\n- One\n- Two",
    ),
  );
  const doc = new JSDOM(a.body).window.document;
  assert.equal(doc.querySelectorAll("ol li").length, 2);
  assert.equal(doc.querySelectorAll("ul li").length, 2);
  assert.equal(doc.querySelector("strong").textContent, "Save");
  assert.equal(doc.querySelector("a").href, "https://drx.featurebase.app/");
  assert.doesNotMatch(doc.body.textContent, /\*\*|\]\(/);
});
test("rejects unsupported Markdown, unsafe links and skipped numbered steps", () => {
  for (const body of [
    "<script>alert(1)</script>",
    "[click](javascript:evil)",
    "![image](https://example.com/image.png)",
    "2. Second first",
    "## Heading\ntext",
    "| table |",
  ])
    assert.throws(() => renderArticle(md(body)));
});
test("preserves old heading IDs and fragment destinations when sections change", () => {
  const a = renderArticle(md("## Save\n\nSave once."), [
    { id: "old-save", text: "Save" },
    { id: "old-removed", text: "Old heading" },
  ]);
  const doc = new JSDOM(a.body).window.document;
  assert.equal(doc.querySelector("h2").id, "old-save");
  assert.ok(doc.getElementById("old-removed"));
  assert.throws(() =>
    renderArticle(md("## Save\n\nText"), [{ id: '"><script>', text: "Save" }]),
  );
});
test("comparison detects lost links, lists, anchors and metadata", () => {
  const a = renderArticle(
    md("## Save\n\n1. [Help](https://drx.featurebase.app)"),
  );
  assert.equal(
    contentFingerprint(a),
    contentFingerprint({ ...a, body: `\n${a.body}\n` }),
  );
  for (const b of [
    { ...a, title: "Changed" },
    { ...a, body: a.body.replace("ol>", "ul>") },
    {
      ...a,
      body: a.body.replace(
        "https://drx.featurebase.app",
        "https://example.com",
      ),
    },
    { ...a, body: a.body.replace('id="save"', 'id="gone"') },
  ])
    assert.notEqual(contentFingerprint(a), contentFingerprint(b));
});
test("entire canonical publication set renders, has unique stable IDs, and no link cycles", () => {
  const { articles } = loadHelpContent();
  assert.equal(articles.length, 19);
  assert.equal(new Set(articles.map((a) => a.id)).size, 19);
  assert.ok(
    articles.every(
      (a) => a.links.length && a.headings.length && !a.visuals.length,
    ),
  );
  const privacy = articles.find((a) => a.id === "6417807");
  const text = new JSDOM(privacy.body).window.document.body.textContent;
  for (const term of [
    "Alias Mode",
    "30 days",
    "Standard Mode",
    "180 days",
    "Full Customer Mode",
    "365 days",
    "permanently deletes qualifying inactive customer records when it runs",
  ])
    assert.ok(text.includes(term), term);
  assert.doesNotMatch(
    articles.map((a) => a.body).join("\n"),
    /Business CRM Mode|DRX CRM|https:\/\/deelrxcrm.com\/support/,
  );
});
test("rejects title-based duplicate identities and archived sources", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drx-help-test-"));
  try {
    fs.cpSync(
      "docs/featurebase/help-center-manifest.json",
      path.join(temp, "docs/featurebase/help-center-manifest.json"),
      { recursive: true },
    );
    fs.cpSync("app-docs", path.join(temp, "app-docs"), { recursive: true });
    const manifestPath = path.join(
      temp,
      "docs/featurebase/help-center-manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath));
    manifest.articles[1].id = manifest.articles[0].id;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => loadHelpContent(temp), /Duplicate/);
    manifest.articles[0].sourcePath = "app-docs/_archive/old.md";
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => loadHelpContent(temp), /Noncanonical/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
