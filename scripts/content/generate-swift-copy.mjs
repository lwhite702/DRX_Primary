import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { drxContent } from "../../packages/content/src/index.ts";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const outputPath = path.join(repositoryRoot, "apps/ios/DRXApp/Content/DRXContent.swift");

function swiftString(value) {
  return JSON.stringify(value).replaceAll("\\/", "/");
}

function swiftName(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
}

function renderObject(name, value, indent = "    ") {
  const lines = [`${indent}enum ${name[0].toUpperCase()}${name.slice(1)} {`];

  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      lines.push(`${indent}    static let ${swiftName(key)} = ${swiftString(item)}`);
    } else if (typeof item === "number") {
      lines.push(`${indent}    static let ${swiftName(key)} = ${item}`);
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      lines.push(...renderObject(swiftName(key), item, `${indent}    `));
    }
  }

  lines.push(`${indent}}`);
  return lines;
}

const sections = {
  brand: drxContent.brand,
  navigation: drxContent.navigation,
  terms: drxContent.terms,
  privacy: drxContent.privacy,
  actions: drxContent.actions,
  messages: drxContent.messages,
};

const generated = [
  "// Generated from packages/content/src/index.ts.",
  "// Run `pnpm content:swift:write` after changing the shared catalog.",
  "",
  "import Foundation",
  "",
  "enum DRXContent {",
  `    static let schemaVersion = ${drxContent.schemaVersion}`,
  ...Object.entries(sections).flatMap(([name, value]) => ["", ...renderObject(name, value)]),
  "}",
  "",
].join("\n");

if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, generated);
  console.log(`Wrote ${path.relative(repositoryRoot, outputPath)}`);
  process.exit(0);
}

if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== generated) {
  console.error("Generated Swift content is stale. Run `pnpm content:swift:write`.");
  process.exit(1);
}

console.log("Generated Swift content matches the shared catalog.");
