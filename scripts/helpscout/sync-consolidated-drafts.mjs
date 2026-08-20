#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_DIR = path.join(ROOT, "docs/help-center-export/helpscout-10");
const API_BASE = "https://docsapi.helpscout.net/v1";

const targets = [
  ["01-get-started-with-deelrx-crm.md", "6a7d6223714de94e758bafc2"],
  ["02-workspaces-team-roles-and-access.md", "6a7d86bb3c57d45466b9cd31"],
  ["03-dashboard-reports-and-drx-intelligence.md", "6a7d86c7bdad84857311aaf3"],
  ["04-quick-sale-payments-barcodes-and-receipts.md", "6a7e2083997ac821904e2a12"],
  ["05-sales-history-refunds-and-reconciliation.md", "6a7d867f3c57d45466b9cd2f"],
  ["06-inventory-intake-adjustments-and-purchase-orders.md", "6a7d8698714de94e758bb00a"],
  ["07-inventory-audit-trail-and-stock-troubleshooting.md", "6a7d86d3bdad84857311aaf4"],
  ["08-customers-aliases-credit-and-payments.md", "6a7d868b714de94e758bb009"],
  ["09-privacy-security-and-data-requests.md", "6a7e2030bdad84857311adf0"],
  ["10-troubleshooting-and-support.md", "6a7d86f373778c51e837e824"],
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;

  const closeParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    const unordered = line.match(/^\s*-\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);

    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (unordered || ordered) {
      closeParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
    } else if (line.trim() === "") {
      closeParagraph();
      closeList();
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }

  closeParagraph();
  closeList();
  return output.join("\n");
}

function parseSource(source, filename) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter in ${filename}`);

  const title = match[1].match(/^title:\s*"([^"]+)"$/m)?.[1];
  if (!title) throw new Error(`Missing title in ${filename}`);

  return { title, html: markdownToHtml(match[2].trim()) };
}

async function main() {
  const live = process.argv.includes("--live");
  const verify = process.argv.includes("--verify");
  const apiKey = process.env.HELPSCOUT_DOCS_API_KEY || process.env.HELPSCOUT_API_KEY;
  const plan = [];

  if (live && verify) {
    throw new Error("Use either --live or --verify, not both.");
  }

  for (const [filename, articleId] of targets) {
    const source = await fs.readFile(path.join(SOURCE_DIR, filename), "utf8");
    const { title, html } = parseSource(source, filename);
    plan.push({ filename, articleId, title, bytes: Buffer.byteLength(html) });

    if (verify) {
      if (!apiKey) {
        throw new Error("Set HELPSCOUT_DOCS_API_KEY in the secret environment before using --verify.");
      }

      const response = await fetch(`${API_BASE}/articles/${articleId}?draft=true`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`${articleId} draft read-back returned ${response.status}.`);
      }

      const payload = await response.json();
      const article = payload.article || payload;
      if (article.text !== html) {
        throw new Error(`${articleId} draft body does not match ${filename}.`);
      }
      continue;
    }

    if (!live) continue;
    if (!apiKey) {
      throw new Error("Set HELPSCOUT_DOCS_API_KEY in the secret environment before using --live.");
    }

    const response = await fetch(`${API_BASE}/articles/${articleId}/drafts`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: html }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`${articleId} returned ${response.status}: ${message.slice(0, 300)}`);
    }
  }

  console.table(plan);
  if (verify) {
    console.log(`Verified ${plan.length} Help Scout drafts against source.`);
  } else if (live) {
    console.log(`Saved ${plan.length} Help Scout drafts.`);
  } else {
    console.log(`Dry run: ${plan.length} drafts would be saved.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
