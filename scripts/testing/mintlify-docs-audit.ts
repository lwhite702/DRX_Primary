import fs from "node:fs";
import path from "node:path";

type ClaimStatus = "live" | "beta" | "planned" | "unknown";

type MatrixRow = {
  page: string;
  claim: string;
  claim_status: ClaimStatus;
  evidence_paths: string[];
  voice_violations: string[];
  usability_gaps: string[];
  severity: string;
  required_action: string;
};

type Finding = {
  code: string;
  message: string;
  file?: string;
};

type DocsConfig = {
  navigation:
    | Array<{
        group: string;
        pages: string[];
      }>
    | {
        groups?: Array<{
          group: string;
          pages: string[];
        }>;
      };
};

const root = process.cwd();
const mintlifyDir = path.join(root, "mintlify");
const docsConfigPath = path.join(mintlifyDir, "docs.json");
const matrixPath = path.join(root, "docs/audits/mintlify-parity-matrix.json");

const forbiddenWords = [
  "authenticate",
  "immutable",
  "methodology",
  "optimize",
  "leverage",
  "synergy",
  "infrastructure",
  "robust",
  "enterprise",
  "compliance",
];

const operationalPages = new Set([
  "getting-started",
  "store-setup",
  "how-sales-work",
  "quick-sale-runbook",
  "your-products",
  "your-customers",
  "payments-and-plans",
  "numbers-that-matter",
  "staying-compliant",
  "team-access",
  "keeping-your-data-safe",
  "fixing-issues",
  "failsafe-and-self-destruct",
]);

const requiredSectionHeadings = [
  "What this page is for",
  "Before you start",
  "Fast path",
  "If blocked",
  "What is beta here",
  "Related docs",
];

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function resolvePageFile(slug: string): string | null {
  const mdx = path.join(mintlifyDir, `${slug}.mdx`);
  if (fs.existsSync(mdx)) return mdx;

  const md = path.join(mintlifyDir, `${slug}.md`);
  if (fs.existsSync(md)) return md;

  return null;
}

function stripCodeBlocks(input: string): string {
  return input.replace(/```[\s\S]*?```/g, " ");
}

function stripMarkdownLinksKeepLabel(input: string): string {
  return input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

function extractInternalLinks(markdown: string): string[] {
  const links = [...markdown.matchAll(/\[[^\]]+\]\((\/[^)]+)\)/g)].map((m) => m[1]);
  return links;
}

function normalizeLinkToSlug(href: string): string {
  const withoutQuery = href.split("?")[0]?.split("#")[0] ?? href;
  return withoutQuery.replace(/^\//, "");
}

function hasHeading(markdown: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^##\\s+${escaped}\\s*$`, "im");
  return re.test(markdown);
}

function checkForbiddenWords(markdown: string, filePath: string): Finding[] {
  const findings: Finding[] = [];
  const visible = stripMarkdownLinksKeepLabel(stripCodeBlocks(markdown)).toLowerCase();

  for (const word of forbiddenWords) {
    const re = new RegExp(`\\b${word}\\b`, "g");
    if (re.test(visible)) {
      findings.push({
        code: "VOICE_FORBIDDEN_WORD",
        message: `Forbidden brand word found: ${word}`,
        file: filePath,
      });
    }
  }

  return findings;
}

function main() {
  const findings: Finding[] = [];

  if (!fs.existsSync(docsConfigPath)) {
    throw new Error(`Missing mintlify docs config: ${docsConfigPath}`);
  }

  if (!fs.existsSync(matrixPath)) {
    throw new Error(`Missing parity matrix: ${matrixPath}`);
  }

  const docsConfig = readJson<DocsConfig>(docsConfigPath);
  const matrix = readJson<MatrixRow[]>(matrixPath);

  const rawNav = docsConfig.navigation;
  const groups = Array.isArray(rawNav) ? rawNav : (rawNav?.groups ?? []);
  const slugs = groups.flatMap((group) => group.pages);
  const slugSet = new Set(slugs);

  for (const slug of slugs) {
    const pageFile = resolvePageFile(slug);
    if (!pageFile) {
      findings.push({
        code: "NAV_PAGE_MISSING_FILE",
        message: `docs.json references missing page file: ${slug}`,
      });
      continue;
    }

    const markdown = readText(pageFile);

    findings.push(...checkForbiddenWords(markdown, pageFile));

    const links = extractInternalLinks(markdown);
    for (const link of links) {
      const linkedSlug = normalizeLinkToSlug(link);
      if (!linkedSlug) continue;
      if (!slugSet.has(linkedSlug)) {
        findings.push({
          code: "BROKEN_INTERNAL_LINK",
          message: `Internal link points to page not listed in docs.json: ${link}`,
          file: pageFile,
        });
      }
    }

    if (operationalPages.has(slug)) {
      for (const heading of requiredSectionHeadings) {
        if (!hasHeading(markdown, heading)) {
          findings.push({
            code: "MISSING_REQUIRED_SECTION",
            message: `Missing required section heading: ${heading}`,
            file: pageFile,
          });
        }
      }
    }
  }

  const nonLiveByPage = new Map<string, MatrixRow[]>();
  for (const row of matrix) {
    if (row.claim_status === "live") continue;
    const key = row.page.replace(/^\//, "");
    const list = nonLiveByPage.get(key) ?? [];
    list.push(row);
    nonLiveByPage.set(key, list);
  }

  for (const [slug, rows] of nonLiveByPage.entries()) {
    const pageFile = resolvePageFile(slug);
    if (!pageFile) {
      findings.push({
        code: "MATRIX_PAGE_MISSING_FILE",
        message: `Parity matrix references missing page: /${slug}`,
      });
      continue;
    }

    const markdown = readText(pageFile).toLowerCase();
    if (!markdown.includes("beta")) {
      findings.push({
        code: "NON_LIVE_CLAIM_WITHOUT_BETA_LABEL",
        message: `Page has non-live claims but does not mention beta (matrix rows: ${rows.length})`,
        file: pageFile,
      });
    }
  }

  if (findings.length > 0) {
    console.error(`❌ Mintlify docs audit failed with ${findings.length} finding(s).`);
    for (const finding of findings) {
      const suffix = finding.file ? ` [${path.relative(root, finding.file)}]` : "";
      console.error(`- ${finding.code}: ${finding.message}${suffix}`);
    }
    process.exit(1);
  }

  console.log(`✅ Mintlify docs audit passed (${slugs.length} pages checked).`);
}

main();
