export function stableId(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseRoadmap(markdown) {
  const items = [];
  let section = null;
  let current = null;

  function finish() {
    if (!current) return;
    current.content = current.description.join(" ").trim();
    delete current.description;
    items.push(current);
    current = null;
  }

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^## (Now|Next|Later)\s*$/);
    if (heading) {
      finish();
      section = heading[1];
      continue;
    }
    if (/^## /.test(line)) {
      finish();
      section = null;
      continue;
    }
    const item = line.match(/^- \*\*(.+?)\*\* \(`([^`]+)`\)\s*$/);
    if (item && section) {
      finish();
      const title = `${section}: ${item[1]}`;
      current = {
        stableId: `roadmap-${stableId(item[1])}`,
        title,
        state: item[2],
        section: section.toLowerCase(),
        description: [],
      };
      continue;
    }
    if (current && line.trim()) current.description.push(line.trim());
  }
  finish();
  return items;
}

export function parseCustomerChangelog(markdown) {
  const entries = [];
  let current = null;
  let category = null;

  function finish() {
    if (!current) return;
    current.categories = [...current.sections.keys()];
    current.markdownContent = [...current.sections.entries()]
      .map(([name, bullets]) => `### ${name}\n\n${bullets.map((bullet) => `- ${bullet}`).join("\n")}`)
      .join("\n\n");
    delete current.sections;
    entries.push(current);
    current = null;
    category = null;
  }

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^## (\d{4}-\d{2}-\d{2}) — v(\d+\.\d+\.\d+)\s*$/);
    if (heading) {
      finish();
      current = {
        stableId: `changelog-v${heading[2].replaceAll(".", "-")}`,
        version: heading[2],
        date: heading[1],
        title: `v${heading[2]} — ${heading[1]}`,
        sections: new Map(),
      };
      continue;
    }
    const categoryHeading = line.match(/^### (New|Improved|Fixed)\s*$/);
    if (categoryHeading && current) {
      category = categoryHeading[1];
      if (!current.sections.has(category)) current.sections.set(category, []);
      continue;
    }
    const bullet = line.match(/^- (.+)$/);
    if (bullet && current && category) current.sections.get(category).push(bullet[1]);
  }
  finish();
  return entries.filter((entry) => entry.markdownContent.trim());
}

export function parseMode(argv) {
  const publish = argv.includes("--publish");
  const dryRun = argv.includes("--dry-run") || !publish;
  if (publish && argv.includes("--dry-run")) throw new Error("Choose either --dry-run or --publish.");
  return { dryRun, publish };
}
