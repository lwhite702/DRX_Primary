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
  if (typeof value !== "string" || !value.trim()) {
    fail("Unsafe article URL");
  }
  if (value.startsWith("//") || value.startsWith("\\\\")) {
    fail("Unsafe article URL");
  }
  try {
    const url = new URL(value);
    if (
      !["https:", "mailto:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      fail("Unsafe article URL");
    }
    return value;
  } catch {
    if (value.startsWith("#")) {
      if (!/^#[a-zA-Z0-9_-]+$/.test(value)) fail("Unsafe article anchor");
      return value;
    }
    if (value.includes(":")) {
      fail("Unsafe article URL");
    }
    if (value.startsWith(".") || value.startsWith("/") || value.endsWith(".md") || value.includes(".md#")) {
      return value;
    }
    fail("Unsafe article URL");
  }
}
function inline(value, resolveLink) {
  if (value.includes("![")) fail("Images must be standalone blocks");
  // Deliberately small, lossless subset. Unsupported Markdown fails instead of publishing literal syntax.
  const tokens =
    /\[([^\[\]\n]+)\]\(([^\s()]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;
  let html = "",
    position = 0;
  const plain = (text) => {
    if (/[\[\]`]|<[a-zA-Z!/]/.test(text)) fail(`Unsupported inline Markdown: ${text}`);
    return escapeHtml(text);
  };
  for (const match of value.matchAll(tokens)) {
    html += plain(value.slice(position, match.index));
    if (match[1]) {
      let href = match[2];
      if (resolveLink) {
        href = resolveLink(href);
      }
      html += `<a href="${escapeHtml(safeUrl(href))}">${plain(match[1])}</a>`;
    } else if (match[3]) html += `<strong>${plain(match[3])}</strong>`;
    else if (match[4]) html += `<em>${plain(match[4])}</em>`;
    else html += `<code>${escapeHtml(match[5])}</code>`;
    position = match.index + match[0].length;
  }
  return html + plain(value.slice(position));
}
function isApprovedFeaturebaseImageUrl(value) {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    (url.hostname === "drx.featurebase.app" ||
      url.hostname === "fb-usercontent.fra1.cdn.digitaloceanspaces.com" ||
      url.hostname.endsWith(".featurebase-attachments.com"))
  );
}

export function loadHelpVisuals(
  root = process.cwd(),
  { requirePublished = false } = {},
) {
  const manifestPath = path.join(
    root,
    "docs/featurebase/help-center-visuals.json",
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (
    manifest.schemaVersion !== 1 ||
    manifest.helpCenterId !== "l4o5pamx855mr65p" ||
    manifest.assetCount !== manifest.assets?.length ||
    manifest.assets.length !== 20
  )
    fail("Wrong Help Center visual manifest");
  const ids = new Set(),
    sourcePaths = new Set();
  for (const asset of manifest.assets) {
    if (
      !/^[a-z0-9-]+$/.test(asset.id) ||
      ids.has(asset.id) ||
      sourcePaths.has(asset.sourcePath) ||
      !["header", "screenshot", "diagram"].includes(asset.kind) ||
      !asset.sourcePath.startsWith("app-docs/_assets/help-center/") ||
      asset.sourcePath.includes("..") ||
      !asset.alt?.trim() ||
      !asset.sha256?.match(/^[a-f0-9]{64}$/)
    )
      fail("Invalid or duplicate Help Center visual");
    const sourcePath = path.join(root, asset.sourcePath);
    if (!fs.existsSync(sourcePath))
      fail(`Missing Help Center visual: ${asset.id}`);
    const bytes = fs.readFileSync(sourcePath);
    if (asset.bytes !== bytes.length || asset.sha256 !== sha256(bytes))
      fail(`Help Center visual checksum differs: ${asset.id}`);
    if (
      !Array.isArray(asset.articlePlacements) ||
      !asset.articlePlacements.length
    )
      fail(`Help Center visual has no placement: ${asset.id}`);
    const placementKeys = new Set();
    for (const placement of asset.articlePlacements) {
      const placementKey = `${placement.articleId}:${placement.placement}:${placement.heading ?? ""}`;
      if (
        !/^\d{7}$/.test(placement.articleId) ||
        !["lead", "before-heading"].includes(placement.placement) ||
        (placement.placement === "lead" && placement.heading !== null) ||
        (placement.placement === "before-heading" &&
          !placement.heading?.trim()) ||
        placementKeys.has(placementKey)
      )
        fail(`Invalid or duplicate Help Center visual placement: ${asset.id}`);
      placementKeys.add(placementKey);
    }
    if (
      asset.caption &&
      asset.caption !== "Illustrative screen with fictional data."
    )
      fail(`Unexpected Help Center visual caption: ${asset.id}`);
    if (
      asset.provenance === "fixture" &&
      asset.caption !== "Illustrative screen with fictional data."
    )
      fail(`Fixture caption is missing: ${asset.id}`);
    const publishedUrl = asset.featurebase?.publicUrl;
    if (publishedUrl && !isApprovedFeaturebaseImageUrl(publishedUrl))
      fail(`Unsafe or expiring Featurebase visual URL: ${asset.id}`);
    if (
      requirePublished &&
      (asset.featurebase?.state !== "uploaded" ||
        !publishedUrl ||
        !asset.featurebase.attachmentIdentity)
    )
      fail(`Featurebase visual is not uploaded: ${asset.id}`);
    ids.add(asset.id);
    sourcePaths.add(asset.sourcePath);
  }
  return manifest;
}

export function renderArticle(markdown, previousHeadings = [], options = {}) {
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
  const visualManifest = options.visualManifest;
  const visualByPath = new Map(
    visualManifest?.assets.map((asset) => [asset.sourcePath, asset]) ?? [],
  );
  const sourceDirectory = options.sourcePath
    ? path.posix.dirname(options.sourcePath)
    : undefined;
  const anchor = (label) => {
    const base =
      previousHeadings.find((h) => h.text.toLowerCase() === label.toLowerCase())
        ?.id ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!base || !/^[a-zA-Z0-9_-]+$/.test(base))
      fail("Invalid or duplicate heading");
    let id = base;
    if (options.sourcePath) {
      let suffix = 1;
      while (used.has(id)) {
        suffix += 1;
        id = `${base}-${suffix}`;
      }
    } else if (used.has(id)) {
      fail("Invalid or duplicate heading");
    }
    used.add(id);
    return id;
  };
  let rawBody = match[3];
  if (options.sourcePath) {
    rawBody = rawBody
      .replace(/\*\*(\[[^\[\]\n]+\]\([^\s()]+\))\*\*/g, "$1")
      .replace(/^\s*<\/?Tabs>\s*$/gm, "")
      .replace(/^\s*<\/Tab>\s*$/gm, "")
      .replace(/^\s*<Tab\s+title="([^"]+)">\s*$/gm, "\n### $1\n");
    const rawLines = rawBody.split("\n");
    const normalizedLines = [];
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i]
        .replace(/^>\s+/, "")
        .replace(/^ {4}(?=\d+\. |- |[A-Za-z*`])/, "")
        .replace(/^ {7}(?=- )/, "   ");
      if (
        normalizedLines.length > 0 &&
        normalizedLines[normalizedLines.length - 1].trim() !== "" &&
        ((/^(\d+\.|-)\s/.test(line) &&
          !/^\s*(\d+\.|-)\s/.test(normalizedLines[normalizedLines.length - 1])) ||
          /^#{2,3}\s/.test(line))
      ) {
        normalizedLines.push("");
      }
      normalizedLines.push(line);
      if (
        /^#{2,3}\s/.test(line) &&
        i + 1 < rawLines.length &&
        rawLines[i + 1].trim() !== ""
      ) {
        normalizedLines.push("");
      }
    }
    rawBody = normalizedLines.join("\n");
  }
  const body = rawBody
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const image = block.match(/^!\[([^\]\n]+)\]\(([^\s()]+)\)$/);
      if (image) {
        if (!visualManifest || !sourceDirectory)
          fail("Standalone images require the Help Center visual manifest");
        const resolved = path.posix.normalize(
          path.posix.join(sourceDirectory, image[2]),
        );
        const asset = visualByPath.get(resolved);
        if (!asset || image[1] !== asset.alt)
          fail(`Undeclared Help Center visual: ${image[2]}`);
        const src = asset.featurebase?.publicUrl || `../../${asset.sourcePath}`;
        return `<img data-help-visual="${escapeHtml(asset.id)}" src="${escapeHtml(src)}" alt="${escapeHtml(asset.alt)}">`;
      }
      if (/^#{2,3} /.test(block)) {
        if (block.includes("\n")) fail("Heading must be separated from text");
        const [, marks, text] = block.match(/^(#{2,3}) (.+)$/);
        return `<h${marks.length} id="${anchor(text)}">${inline(text, options.resolveLink)}</h${marks.length}>`;
      }
      const lines = block.split("\n");
      if (/^\d+\. /.test(lines[0])) {
        const items = [];
        let currentStep = 0;
        let currentItem = null;
        for (const line of lines) {
          const stepMatch = line.match(/^(\d+)\.\s+(.*)$/);
          if (stepMatch) {
            currentStep++;
            if (Number(stepMatch[1]) !== currentStep) {
              fail("Numbered steps must start at 1 and be consecutive");
            }
            if (currentItem) items.push(currentItem);
            currentItem = { text: stepMatch[2], subItems: [] };
          } else if (line.trim().startsWith("- ") && currentItem) {
            currentItem.subItems.push(line.trim().slice(2));
          } else if (currentItem) {
            currentItem.text += " " + line.trim();
          } else {
            fail("Unsupported block Markdown");
          }
        }
        if (currentItem) items.push(currentItem);
        return (
          "<ol>" +
          items
            .map((item) => {
              let html = `<li><p>${inline(item.text, options.resolveLink)}</p>`;
              if (item.subItems.length > 0) {
                html +=
                  "<ul>" +
                  item.subItems
                    .map((sub) => `<li><p>${inline(sub, options.resolveLink)}</p></li>`)
                    .join("") +
                  "</ul>";
              }
              html += "</li>";
              return html;
            })
            .join("") +
          "</ol>"
        );
      }
      if (lines.every((line) => line.startsWith("- ")))
        return (
          "<ul>" +
          lines
            .map((line) => `<li><p>${inline(line.slice(2), options.resolveLink)}</p></li>`)
            .join("") +
          "</ul>"
        );
      if (lines.some((line) => /^\s*(#|>|\||-|\d+\.)/.test(line)))
        fail("Unsupported block Markdown");
      return `<p>${inline(lines.join(" "), options.resolveLink)}</p>`;
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
    const attrs = ["href", "id", "src", "alt", "data-help-visual"]
      .filter((key) => node.hasAttribute(key))
      .map((key) => {
        let value = node.getAttribute(key);
        if (key === "src" && /^https:\/\//.test(value)) {
          const url = new URL(value);
          if (
            url.hostname.endsWith(".featurebase-attachments.com") ||
            url.hostname === "fb-usercontent.fra1.cdn.digitaloceanspaces.com"
          ) {
            url.search = "";
            url.hash = "";
            value = url.toString();
          }
        }
        return [key, value];
      });
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
export function loadHelpContent(root = process.cwd(), options = {}) {
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
  const visualManifest = loadHelpVisuals(root, {
    requirePublished: options.requirePublishedVisuals === true,
  });
  const ids = new Set(),
    sources = new Set();
  const articleBySource = new Map(
    manifest.articles.map((entry) => [entry.sourcePath, entry]),
  );
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
    const resolveLink = (href) => {
      if (
        !href ||
        href.startsWith("https:") ||
        href.startsWith("mailto:") ||
        href.startsWith("#")
      ) {
        return href;
      }
      const [filePart, hashPart] = href.split("#");
      if (filePart.endsWith(".md")) {
        const sourceDir = path.posix.dirname(entry.sourcePath);
        const resolvedPath = path.posix.normalize(
          path.posix.join(sourceDir, filePart),
        );
        const target = articleBySource.get(resolvedPath);
        if (!target) {
          fail(`Unresolved relative article link: ${href} in ${entry.sourcePath}`);
        }
        return target.publicUrl + (hashPart ? `#${hashPart}` : "");
      }
      return href;
    };
    const rendered = renderArticle(source, entry.previousHeadings, {
      sourcePath: entry.sourcePath,
      visualManifest,
      resolveLink,
    });
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
    article.visuals = [...doc.querySelectorAll("img[data-help-visual]")].map(
      (e) => ({
        id: e.getAttribute("data-help-visual"),
        alt: e.getAttribute("alt"),
        src: e.getAttribute("src"),
      }),
    );
    for (const link of article.links) {
      if (
        link.url.endsWith(".md") ||
        link.url.includes(".md#") ||
        link.url.startsWith(".")
      ) {
        fail(`Unresolved relative link in article: ${link.url}`);
      }
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
  const expectedPlacements = visualManifest.assets.flatMap((asset) =>
    asset.articlePlacements.map((placement) => ({ ...placement, asset })),
  );
  if (expectedPlacements.some((placement) => !ids.has(placement.articleId)))
    fail("Help Center visual references an unknown article");
  let observedPlacementCount = 0;
  for (const article of articles) {
    const doc = new JSDOM(article.body).window.document;
    const expected = expectedPlacements.filter(
      (placement) => placement.articleId === article.id,
    );
    const observed = [...doc.querySelectorAll("img[data-help-visual]")];
    observedPlacementCount += observed.length;
    if (
      observed.length !== expected.length ||
      new Set(observed.map((image) => image.getAttribute("data-help-visual")))
        .size !== observed.length
    )
      fail(`Help Center visual count differs: ${article.id}`);
    for (const placement of expected) {
      const image = observed.find(
        (candidate) =>
          candidate.getAttribute("data-help-visual") === placement.asset.id,
      );
      if (!image || image.getAttribute("alt") !== placement.asset.alt)
        fail(`Help Center visual differs: ${placement.asset.id}`);
      const elements = [...doc.body.children].filter(
        (element) => element.tagName !== "A",
      );
      const index = elements.indexOf(image);
      if (placement.placement === "lead" && index !== 0)
        fail(`Help Center lead visual moved: ${placement.asset.id}`);
      if (placement.placement === "before-heading") {
        const hasExactHeading = [...doc.querySelectorAll("h2,h3")].some(
          (candidate) => candidate.textContent === placement.heading,
        );
        if (hasExactHeading) {
          const heading = elements[index + (placement.asset.caption ? 2 : 1)];
          if (
            !heading ||
            !["H2", "H3"].includes(heading.tagName) ||
            heading.textContent !== placement.heading
          )
            fail(`Help Center visual placement differs: ${placement.asset.id}`);
        } else if (
          !elements
            .slice(index + 1)
            .some((element) => ["H2", "H3"].includes(element.tagName))
        ) {
          fail(`Help Center visual placement differs: ${placement.asset.id}`);
        }
      }
      if (placement.asset.caption) {
        const caption = elements[index + 1];
        if (
          caption?.tagName === "P" &&
          caption.textContent === placement.asset.caption
        ) {
          // Matches exact caption
        } else if (!caption) {
          fail(`Help Center visual caption differs: ${placement.asset.id}`);
        }
      }
    }
  }
  if (observedPlacementCount !== expectedPlacements.length)
    fail("Help Center visual placement total differs");
  const visit = (id, stack = new Set(), done = new Set()) => {
    if (stack.has(id) || done.has(id)) return;
    const next = new Set(stack).add(id);
    for (const link of articles.find((a) => a.id === id).links) {
      let parsed;
      try {
        parsed = new URL(link.url, manifest.origin);
      } catch {
        continue;
      }
      if (parsed.origin !== manifest.origin) continue;
      const target = parsed.pathname.match(/\/articles\/(\d+)/)?.[1];
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
        visualManifest,
        sources: articles.map((a) => [a.id, a.sourceSha256]),
      }),
    ),
  };
}
