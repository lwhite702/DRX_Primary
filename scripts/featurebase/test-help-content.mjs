import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  renderArticle,
  loadHelpContent,
  loadHelpVisuals,
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
    "[click](javascript:alert(1)//.md)",
    "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==//.md)",
    "[click](//evil.com/test.md)",
    "![image](https://example.com/image.png)",
    "2. Second first",
    "## Heading\ntext",
    "| table |",
  ])
    assert.throws(() => renderArticle(md(body)));
});
test("resolves relative markdown links to manifest public URLs and preserves anchors", () => {
  const rendered = renderArticle(
    md("Read [Troubleshoot stock and audit](../troubleshooting/troubleshoot-inventory-and-audit.md#fix-a-count)."),
    [],
    {
      sourcePath: "app-docs/feature_overview/inventory-intake-and-adjustments.md",
      resolveLink: (href) => {
        if (href.startsWith("../troubleshooting/troubleshoot-inventory-and-audit.md")) {
          const hash = href.split("#")[1];
          return `https://drx.featurebase.app/en/help/articles/0272622-troubleshoot-inventory-and-audit${hash ? `#${hash}` : ""}`;
        }
        return href;
      },
    },
  );
  const doc = new JSDOM(rendered.body).window.document;
  const link = doc.querySelector("a");
  assert.equal(
    link.href,
    "https://drx.featurebase.app/en/help/articles/0272622-troubleshoot-inventory-and-audit#fix-a-count",
  );
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
test("renders only declared standalone Help Center images", () => {
  const visualManifest = {
    assets: [
      {
        id: "guide-image",
        sourcePath: "app-docs/_assets/help/guide.png",
        alt: "The useful part of the guide.",
        featurebase: {
          publicUrl:
            "https://fb-usercontent.fra1.cdn.digitaloceanspaces.com/guide.png",
        },
      },
    ],
  };
  const article = renderArticle(
    md("![The useful part of the guide.](_assets/help/guide.png)"),
    [],
    { sourcePath: "app-docs/guide.md", visualManifest },
  );
  const image = new JSDOM(article.body).window.document.querySelector("img");
  assert.equal(image.getAttribute("data-help-visual"), "guide-image");
  assert.equal(image.alt, "The useful part of the guide.");
  assert.throws(() =>
    renderArticle(md("![Wrong alt.](_assets/help/guide.png)"), [], {
      sourcePath: "app-docs/guide.md",
      visualManifest,
    }),
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
test("comparison ignores temporary Featurebase image signatures", () => {
  const first = renderArticle(md("Text"));
  const second = renderArticle(md("Text"));
  first.body +=
    '<img data-help-visual="guide" src="https://cdn.featurebase-attachments.com/guide.png?signature=one" alt="Guide">';
  second.body +=
    '<img data-help-visual="guide" src="https://cdn.featurebase-attachments.com/guide.png?signature=two" alt="Guide">';
  assert.deepEqual(contentFingerprint(first), contentFingerprint(second));
});
test("entire canonical publication set renders, has unique stable IDs, and no link cycles", () => {
  const { articles } = loadHelpContent();
  assert.equal(articles.length, 19);
  assert.equal(new Set(articles.map((a) => a.id)).size, 19);
  assert.ok(articles.every((a) => a.links.length && a.headings.length));
  assert.equal(
    articles.reduce((sum, article) => sum + article.visuals.length, 0),
    23,
  );
  assert.equal(loadHelpVisuals().assets.length, 20);
  const privacy = articles.find((a) => a.id === "6417807");
  const text = new JSDOM(privacy.body).window.document.body.textContent;
  for (const term of [
    "Alias Mode",
    "30 days",
    "Standard Mode",
    "180 days",
    "Full Customer Mode",
    "365 days",
    "permanently deletes qualified records",
  ])
    assert.ok(text.includes(term), term);
  assert.doesNotMatch(
    articles.map((a) => a.body).join("\n"),
    /Business CRM Mode|DRX CRM|https:\/\/deelrxcrm.com\/support/,
  );
});
test("rejects unsafe and expiring Featurebase image URLs", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drx-help-visual-test-"));
  try {
    fs.cpSync(
      "docs/featurebase/help-center-visuals.json",
      path.join(temp, "docs/featurebase/help-center-visuals.json"),
      { recursive: true },
    );
    fs.cpSync("app-docs/_assets", path.join(temp, "app-docs/_assets"), {
      recursive: true,
    });
    const manifestPath = path.join(
      temp,
      "docs/featurebase/help-center-visuals.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath));
    manifest.assets[0].featurebase.publicUrl =
      "https://example.com/image.png?token=secret";
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => loadHelpVisuals(temp), /Unsafe or expiring/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("rejects title-based duplicate identities and archived sources", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drx-help-test-"));
  try {
    fs.cpSync(
      "docs/featurebase/help-center-manifest.json",
      path.join(temp, "docs/featurebase/help-center-manifest.json"),
      { recursive: true },
    );
    fs.cpSync(
      "docs/featurebase/help-center-visuals.json",
      path.join(temp, "docs/featurebase/help-center-visuals.json"),
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
