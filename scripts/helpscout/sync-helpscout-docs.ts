import fs from "node:fs";
import path from "node:path";

type HelpScoutArticle = { id: string; name: string };
type SearchResponse = { articles?: { items: HelpScoutArticle[] } };
type SyncResult = {
  file: string;
  title: string;
  action: "would-create" | "would-update" | "would-skip" | "created" | "updated" | "deleted" | "error";
  id?: string;
  category?: string;
  reason?: string;
};

type SyncTarget = {
  file: string;
  matchNames?: string[];
  categoryName?: "Getting Started" | "Quick POS" | "Troubleshooting" | "Operations";
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const verbose = args.has("--verbose");
const reportPath =
  process.env.HELPSCOUT_REPORT_PATH ??
  "docs/help-center-export/reports/helpscout-publish-results.json";

const API_KEY = process.env.HELPSCOUT_API_KEY || process.env.HELP_SCOUT_API_KEY || "";
const BASE_URL = process.env.HELPSCOUT_DOCS_API_BASE || "https://docsapi.helpscout.net/v1";
const DEFAULT_COLLECTION_ID =
  process.env.HELPSCOUT_COLLECTION_ID ||
  process.env.HELP_SCOUT_COLLECTION_ID ||
  "6a7d6071714de94e758bafbb";

const CATEGORY_IDS: Record<NonNullable<SyncTarget["categoryName"]>, string> = {
  "Getting Started": "6a7d609634e8da6db205ed0f",
  "Quick POS": "6a7d6096714de94e758bafc0",
  Troubleshooting: "6a7d6096997ac821904e26d8",
  Operations: "6a7d6096bdad84857311aaaa",
};

if (!dryRun && !API_KEY) {
  console.error("Missing HELPSCOUT_API_KEY / HELP_SCOUT_API_KEY.");
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${API_KEY}:X`).toString("base64")}`;

const TARGETS: SyncTarget[] = [
  { file: "app-docs/getting_started/getting-started-get-started-with-drx.md", categoryName: "Getting Started" },
  { file: "app-docs/feature_overview/feature-overview-dashboard-and-reports.md", categoryName: "Quick POS" },
  { file: "app-docs/feature_overview/feature-overview-inventory-receive-and-adjust.md", categoryName: "Quick POS" },
  { file: "app-docs/feature_overview/feature-overview-manage-customers-and-credit.md", categoryName: "Quick POS" },
  { file: "app-docs/feature_overview/feature-overview-privacy-controls.md", categoryName: "Operations" },
  { file: "app-docs/feature_overview/feature-overview-quick-sale-checkout.md", categoryName: "Quick POS" },
  { file: "app-docs/feature_overview/feature-overview-standard-sales-console.md", categoryName: "Quick POS" },
  { file: "app-docs/feature_overview/feature-overview-switch-stores-and-roles.md", categoryName: "Operations" },
  { file: "app-docs/feature_overview/inventory-intake-and-adjustments.md", categoryName: "Quick POS" },
  { file: "app-docs/feature_overview/manage-credit-and-payments.md", categoryName: "Quick POS", matchNames: ["Manage Credit and Payments"] },
  { file: "app-docs/troubleshooting/troubleshoot-inventory-and-audit.md", categoryName: "Troubleshooting" },
  { file: "app-docs/troubleshooting/troubleshoot-checkout-and-payments.md", categoryName: "Troubleshooting" },
  { file: "app-docs/troubleshooting/troubleshooting-checkout-and-sales.md", categoryName: "Troubleshooting" },
  { file: "app-docs/troubleshooting/troubleshooting-customers-and-credit.md", categoryName: "Troubleshooting" },
  { file: "app-docs/troubleshooting/troubleshooting-stores-and-access.md", categoryName: "Troubleshooting" },
];

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---", 4);
  return end >= 0 ? markdown.slice(end + 4) : markdown;
}

function parseTitle(markdown: string, fallbackPath: string): string {
  const front = /^title:\s*["“](.+?)["”]|^title:\s*([^\n]+)/m.exec(markdown);
  if (front) return (front[1] ?? front[2] ?? "").trim();
  return path.basename(fallbackPath).replace(/[-_]/g, " ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown: string): string {
  const source = stripFrontmatter(markdown).trim();
  const lines = source.split("\n");
  const output: string[] = [];
  let listOpen: "ul" | "ol" | null = null;

  const closeList = () => {
    if (!listOpen) return;
    output.push(`</${listOpen}>`);
    listOpen = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length <= 2 ? "h2" : "h3";
      output.push(`<${level}>${inlineMarkdown(heading[2])}</${level}>`);
      continue;
    }

    const ordered = /^(\d+)\.\s+(.+)$/.exec(line);
    if (ordered) {
      if (listOpen !== "ol") {
        closeList();
        listOpen = "ol";
        output.push("<ol>");
      }
      output.push(`<li>${inlineMarkdown(ordered[2])}</li>`);
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      if (listOpen !== "ul") {
        closeList();
        listOpen = "ul";
        output.push("<ul>");
      }
      output.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    closeList();
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return output.join("\n");
}

function normalizeItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const next = payload as SearchResponse;
  return Array.isArray(next.articles?.items) ? (next.articles.items as T[]) : [];
}

async function request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "User-Agent": "drx-helpscout-doc-sync/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} failed (${response.status}): ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function requestRaw(method: string, endpoint: string, body?: unknown): Promise<{ response: Response; text: string }> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "User-Agent": "drx-helpscout-doc-sync/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} failed (${response.status}): ${text}`);
  }
  return { response, text };
}

function findBestMatch(
  targetTitle: string,
  candidates: HelpScoutArticle[],
): HelpScoutArticle | undefined {
  const exact = candidates.find((item) => item.name.toLowerCase() === targetTitle.toLowerCase());
  if (exact) return exact;
  const lower = targetTitle.toLowerCase();
  return candidates.find((item) => item.name.toLowerCase().includes(lower));
}

async function findArticleId(
  title: string,
  aliases: string[] = [],
): Promise<{ id?: string; reason?: string }> {
  if (!API_KEY) return {};

  const searchTerms = [title, ...aliases];
  let fallback: HelpScoutArticle | undefined;
  for (const term of searchTerms) {
    const result = await request<SearchResponse>("GET", `/search/articles?query=${encodeURIComponent(term)}`);
    const candidates = normalizeItems<HelpScoutArticle>(result);
    const match = findBestMatch(term, candidates);
    if (match) return { id: match.id };
    if (!fallback && candidates.length) fallback = candidates[0];
  }

  if (fallback) return { id: fallback.id, reason: "fuzzy-match" };
  return { reason: "not-found" };
}

function resolveCategoryId(categoryName?: SyncTarget["categoryName"]): string | undefined {
  if (!categoryName) return DEFAULT_COLLECTION_ID;
  return CATEGORY_IDS[categoryName] || DEFAULT_COLLECTION_ID;
}

async function syncTarget(target: SyncTarget): Promise<SyncResult> {
  const absPath = path.resolve(process.cwd(), target.file);
  if (!fs.existsSync(absPath)) {
    return {
      file: target.file,
      title: path.basename(target.file),
      action: "error",
      reason: "missing-file",
    };
  }

  const markdown = fs.readFileSync(absPath, "utf8");
  const title = parseTitle(markdown, target.file);
  const categoryId = resolveCategoryId(target.categoryName) ?? DEFAULT_COLLECTION_ID;
  const payload = {
    name: title,
    text: markdownToHtml(markdown),
    status: "published",
    collectionId: DEFAULT_COLLECTION_ID,
    categoryIds: [categoryId],
  };

  const match = await findArticleId(title, target.matchNames ?? []);
  const exists = Boolean(match.id && match.reason !== "fuzzy-match");

  if (dryRun || !API_KEY) {
    return {
      file: target.file,
      title,
      action: match.id ? "would-update" : "would-create",
      id: match.id,
      category: target.categoryName,
      reason: match.reason,
    };
  }

  if (match.id) {
    const current = await request<{ article?: { status?: string } }>("GET", `/articles/${match.id}`);
    const status = current.article?.status || "published";
    await request("PUT", `/articles/${match.id}`, { ...payload, status });
    return {
      file: target.file,
      title,
      action: "updated",
      id: match.id,
      category: target.categoryName,
      reason: exists ? undefined : "created-then-updated",
    };
  }

  const createdRaw = await requestRaw("POST", "/articles", payload);
  const createdBody = createdRaw.text ? (JSON.parse(createdRaw.text) as { id?: string }) : {};
  const createdId =
    /\/articles\/([^/?#]+)/.exec(createdRaw.response.headers.get("location") ?? "")?.[1] ??
    createdBody.id ??
    "";
  if (!createdId) throw new Error(`Could not resolve article id for "${title}" after create`);
  return {
    file: target.file,
    title,
    action: "created",
    id: createdId,
    category: target.categoryName,
  };
}

async function main() {
  const report: SyncResult[] = [];
  for (const target of TARGETS) {
    try {
      const result = await syncTarget(target);
      report.push(result);
      if (verbose || result.action === "error") {
        console.log(JSON.stringify(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const title = fs.existsSync(path.resolve(process.cwd(), target.file))
        ? fs.readFileSync(path.resolve(process.cwd(), target.file), "utf8")
        : "";
      report.push({
        file: target.file,
        title: parseTitle(title, target.file),
        action: "error",
        reason: message,
      });
      console.error(`[sync-helpscout-docs] ${target.file}: ${message}`);
    }
  }

  const outputDir = path.dirname(path.resolve(process.cwd(), reportPath));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), reportPath),
    JSON.stringify(
      {
        dryRun,
        executedAt: new Date().toISOString(),
        results: report,
      },
      null,
      2,
    ),
  );

  const byAction = report.reduce<Record<string, number>>((acc, item) => {
    acc[item.action] = (acc[item.action] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: dryRun ? "dry-run" : "publish",
        reportPath,
      byAction,
    },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
