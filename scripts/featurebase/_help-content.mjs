import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";

export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
export const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const fail = (message) => {
  throw new Error(message);
};
export function safeUrl(value) {
  const url = new URL(value);
  if (
    !["https:", "mailto:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    fail("Unsafe article URL");
  return value;
}
function inline(value) {
  if (value.includes("!["))
    fail("Images need a supported and reviewed visual migration");
  // Deliberately small, lossless subset. Unsupported Markdown fails instead of publishing literal syntax.
  const tokens =
    /\[([^\[\]\n]+)\]\(([^\s()]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;
  let html = "",
    position = 0;
  const plain = (text) => {
    if (/[\[\]*`<>]/.test(text)) fail(`Unsupported inline Markdown: ${text}`);
    return escapeHtml(text);
  };
  for (const match of value.matchAll(tokens)) {
    html += plain(value.slice(position, match.index));
    if (match[1])
      html += `<a href="${escapeHtml(safeUrl(match[2]))}">${plain(match[1])}</a>`;
    else if (match[3]) html += `<strong>${plain(match[3])}</strong>`;
    else html += `<code>${escapeHtml(match[4])}</code>`;
    position = match.index + match[0].length;
  }
  return html + plain(value.slice(position));
}
export function renderArticle(markdown, previousHeadings = []) {
  const match = markdown.match(
    /^---\n(title: .+)\n(description: .+)\n---\n\n([\s\S]+)$/,
  );
  if (!match)
    fail("Expected title and description JSON strings in frontmatter");
  const title = JSON.parse(match[1].slice(7)),
    description = JSON.parse(match[2].slice(13));
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim()
  )
    fail("Empty article metadata");
  const used = new Set();
  const anchor = (label) => {
    let id =
      previousHeadings.find((h) => h.text.toLowerCase() === label.toLowerCase())
        ?.id ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!id || used.has(id) || !/^[a-zA-Z0-9_-]+$/.test(id))
      fail("Invalid or duplicate heading");
    used.add(id);
    return id;
  };
  const body = match[3]
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      if (/^#{2,3} /.test(block)) {
        if (block.includes("\n")) fail("Heading must be separated from text");
        const [, marks, text] = block.match(/^(#{2,3}) (.+)$/);
        return `<h${marks.length} id="${anchor(text)}">${inline(text)}</h${marks.length}>`;
      }
      const lines = block.split("\n");
      if (lines.every((line) => /^\d+\. /.test(line))) {
        return (
          "<ol>" +
          lines
            .map((line, i) => {
              if (!line.startsWith(`${i + 1}. `))
                fail("Numbered steps must start at 1 and be consecutive");
              return `<li><p>${inline(line.replace(/^\d+\. /, ""))}</p></li>`;
            })
            .join("") +
          "</ol>"
        );
      }
      if (lines.every((line) => line.startsWith("- ")))
        return (
          "<ul>" +
          lines
            .map((line) => `<li><p>${inline(line.slice(2))}</p></li>`)
            .join("") +
          "</ul>"
        );
      if (lines.some((line) => /^\s*(#|>|\||-|\d+\.)/.test(line)))
        fail("Unsupported block Markdown");
      return `<p>${inline(lines.join(" "))}</p>`;
    })
    .join("\n");
  // Keep indexed fragment destinations even where a section was replaced.
  const aliases = previousHeadings
    .filter((h) => h.id && !used.has(h.id))
    .map((h) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(h.id)) fail("Unsafe historical anchor");
      used.add(h.id);
      return `<a id="${h.id}"></a>`;
    })
    .join("");
  return { title, description, body: aliases + body };
}
export function contentFingerprint(article) {
  const doc = new JSDOM(article.body).window.document;
  const canonical = (node) => {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, " ");
    if (node.nodeType !== 1) return "";
    const tag = node.tagName.toLowerCase();
    const attrs = ["href", "id", "src", "alt"]
      .filter((key) => node.hasAttribute(key))
      .map((key) => [key, node.getAttribute(key)]);
    return [
      tag,
      attrs,
      [...node.childNodes].map(canonical).filter((v) => v && v !== " "),
    ];
  };
  return sha256(
    JSON.stringify([
      article.title,
      article.description ?? "",
      canonical(doc.body),
    ]),
  );
}
export function loadHelpContent(root = process.cwd()) {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(root, "docs/featurebase/help-center-manifest.json"),
      "utf8",
    ),
  );
  if (
    manifest.schemaVersion !== 1 ||
    manifest.origin !== "https://drx.featurebase.app" ||
    manifest.helpCenterId !== "l4o5pamx855mr65p"
  )
    fail("Wrong Help Center manifest");
  const ids = new Set(),
    sources = new Set();
  const articles = manifest.articles.map((entry) => {
    if (
      !/^\d+$/.test(entry.id) ||
      ids.has(entry.id) ||
      sources.has(entry.sourcePath)
    )
      fail("Duplicate article identity");
    if (
      !entry.sourcePath.startsWith("app-docs/") ||
      entry.sourcePath.includes("..") ||
      entry.sourcePath.includes("/_archive/")
    )
      fail("Noncanonical source path");
    const publicUrl = new URL(entry.publicUrl);
    if (
      publicUrl.origin !== manifest.origin ||
      !publicUrl.pathname.startsWith(`/en/help/articles/${entry.id}`)
    )
      fail("Wrong article URL");
    if (!manifest.collections.some((c) => c.id === entry.parentId))
      fail("Unmapped collection");
    ids.add(entry.id);
    sources.add(entry.sourcePath);
    const source = fs.readFileSync(path.join(root, entry.sourcePath), "utf8");
    const rendered = renderArticle(source, entry.previousHeadings);
    if (
      rendered.title !== entry.title ||
      rendered.description !== entry.description
    )
      fail(`Manifest metadata differs: ${entry.id}`);
    return { ...entry, ...rendered, sourceSha256: sha256(source) };
  });
  if (!articles.length) fail("Empty publication set");
  for (const article of articles) {
    const doc = new JSDOM(article.body).window.document;
    article.links = [...doc.querySelectorAll("a[href]")].map((a) => ({
      text: a.textContent,
      url: a.href,
    }));
    article.headings = [...doc.querySelectorAll("h2,h3")].map((h) => ({
      id: h.id,
      text: h.textContent,
    }));
    article.labels = [...doc.querySelectorAll("strong,code")].map(
      (e) => e.textContent,
    );
    article.visuals = [...doc.querySelectorAll("img,video,iframe")].map(
      (e) => e.outerHTML,
    );
    for (const link of article.links) {
      const url = new URL(link.url);
      if (
        url.origin === manifest.origin &&
        url.pathname.startsWith("/en/help/articles/")
      ) {
        const id = url.pathname.match(/articles\/(\d+)/)?.[1];
        const target = articles.find((a) => a.id === id);
        if (!target || id === article.id)
          fail(`Broken or self-referencing article link: ${article.id}`);
        if (
          url.hash &&
          !new JSDOM(target.body).window.document.getElementById(
            decodeURIComponent(url.hash.slice(1)),
          )
        )
          fail("Broken article fragment");
      }
      if (url.pathname === "/support")
        fail("Nonexistent marketing support route");
    }
  }
  // Related links form a directed workflow; fail circular article chains.
  const visit = (id, stack = new Set(), done = new Set()) => {
    if (stack.has(id)) fail(`Circular related-article chain: ${id}`);
    if (done.has(id)) return;
    const next = new Set(stack).add(id);
    for (const link of articles.find((a) => a.id === id).links) {
      if (new URL(link.url).origin !== manifest.origin) continue;
      const target = new URL(link.url).pathname.match(/\/articles\/(\d+)/)?.[1];
      if (target) visit(target, next, done);
    }
    done.add(id);
  };
  for (const article of articles) visit(article.id);
  return {
    manifest,
    articles,
    contentHash: sha256(
      JSON.stringify({
        manifest,
        sources: articles.map((a) => [a.id, a.sourceSha256]),
      }),
    ),
  };
}
