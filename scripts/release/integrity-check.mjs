#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { validate: validateVersions } = require("../version.js");
const STABLE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function classifyReleaseImpact(change) {
  if (change.backwardIncompatible || change.removesPublicContract) return "major";
  if (change.backwardCompatibleFeature || change.userVisibleBehavior) return "minor";
  if (change.backwardCompatibleFix) return "patch";
  return "none";
}

export function classifyEvidenceState(evidence) {
  if (
    evidence.merged &&
    evidence.repositoryVerified &&
    evidence.distributionVerified &&
    evidence.runtimeVerified
  ) return "released";
  if (evidence.merged && evidence.repositoryVerified) return "implemented";
  return "planned";
}

export function validateDeclaredImpact(required, declared) {
  return required === declared
    ? []
    : [`Declared Release impact ${declared ?? "(missing)"} does not match required ${required}.`];
}

function exportedContractSymbols(line) {
  const value = line.trim();
  if (/^export\s+default\b/.test(value)) return ["default"];

  const declaration = value.match(
    /^export\s+(?:(?:declare|abstract|async)\s+)*(?:const|let|var|function|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/,
  );
  if (declaration) return [declaration[1]];

  const named = value.match(/^export\s*\{([^}]*)\}/);
  if (named) {
    return named[1]
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.split(/\s+as\s+/i).at(-1).trim());
  }

  const star = value.match(/^export\s+\*\s+from\s+(["'][^"']+["'])/);
  if (star) return [`star:${star[1]}`];

  const commonJs = value.match(/^(?:module\.)?exports(?:\.([A-Za-z_$][\w$]*))?\s*=/);
  if (commonJs) return [commonJs[1] ?? "default"];
  return [];
}

function normalizeContract(value) {
  return value.replace(/\s+/g, " ").trim();
}

function functionSignature(source, start) {
  let parentheses = 0;
  let brackets = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === "(") parentheses += 1;
    else if (character === ")") parentheses -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if ((character === "{" || character === ";") && parentheses === 0 && brackets === 0) {
      return source.slice(start, index);
    }
  }
  return source.slice(start);
}

function balancedTypeDeclaration(source, start) {
  let braces = 0;
  let sawBrace = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") {
      braces += 1;
      sawBrace = true;
    } else if (character === "}") {
      braces -= 1;
      if (sawBrace && braces === 0) {
        const semicolon = source[index + 1] === ";" ? index + 2 : index + 1;
        return source.slice(start, semicolon);
      }
    } else if (character === ";" && !sawBrace) {
      return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function exportedContracts(source) {
  const contracts = new Map();
  const declaration = /^\s*export\s+(?:(?:declare|abstract|async|default)\s+)*(function|interface|type|enum)\s*([A-Za-z_$][\w$]*)?/gm;
  for (const match of source.matchAll(declaration)) {
    const [full, kind, symbol] = match;
    const start = match.index + full.search(/export\s/);
    const contract = kind === "function"
      ? functionSignature(source, start)
      : balancedTypeDeclaration(source, start);
    const name = symbol || (full.includes("default") ? "default" : null);
    if (name) contracts.set(name, normalizeContract(contract));
    if (full.includes("default")) {
      contracts.set("default", normalizeContract(contract));
    }
  }

  for (const line of source.split("\n")) {
    for (const symbol of exportedContractSymbols(line)) {
      if (!contracts.has(symbol)) contracts.set(symbol, normalizeContract(line));
    }
  }
  return contracts;
}

function signal(kind, file, symbol = null) {
  return {
    id: [kind, file, symbol].filter(Boolean).join(":"),
    kind,
    file,
    ...(symbol ? { symbol } : {}),
  };
}

function persistedSchemaFile(file) {
  return file === "prisma/schema.prisma"
    || /(^|\/)convex\/schema\.[cm]?[jt]s$/.test(file)
    || /(^|\/)migrations\/.*\.sql$/.test(file)
    || /(^|\/)schema\.(?:prisma|sql)$/.test(file);
}

export function detectBreakingSurfaceSignals(diff, { baseFiles = {}, headFiles = {} } = {}) {
  const signals = new Map();
  const snapshotFiles = new Set([...Object.keys(baseFiles), ...Object.keys(headFiles)]);
  for (const file of [...snapshotFiles].sort()) {
    const before = exportedContracts(baseFiles[file] ?? "");
    const after = exportedContracts(headFiles[file] ?? "");
    for (const [symbol, fingerprint] of before) {
      const next = after.get(symbol);
      const found = next === undefined
        ? signal("export-contract-removed", file, symbol)
        : next !== fingerprint
          ? signal("export-contract-changed", file, symbol)
          : null;
      if (found) signals.set(found.id, found);
    }
  }

  let file = null;
  let destructiveSchemaEdit = false;
  const flushSchema = () => {
    if (file && destructiveSchemaEdit) {
      const found = signal("persisted-schema-destructive-edit", file);
      signals.set(found.id, found);
    }
  };

  for (const line of diff.split("\n")) {
    const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (fileMatch) {
      flushSchema();
      file = fileMatch[2];
      destructiveSchemaEdit = false;
      continue;
    }
    if (!file || line.startsWith("+++") || line.startsWith("---")) continue;
    if (persistedSchemaFile(file) && line.startsWith("-") && !/^\s*(?:$|\/\/|#)/.test(line.slice(1))) {
      destructiveSchemaEdit = true;
    }
  }
  flushSchema();

  if (snapshotFiles.size === 0) {
    const removedByFile = new Map();
    const addedByFile = new Map();
    file = null;
    for (const line of diff.split("\n")) {
      const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (fileMatch) {
        file = fileMatch[2];
        continue;
      }
      if (!file || line.startsWith("+++") || line.startsWith("---")) continue;
      const target = line.startsWith("+") ? addedByFile : line.startsWith("-") ? removedByFile : null;
      if (!target) continue;
      for (const symbol of exportedContractSymbols(line.slice(1))) {
        if (!target.has(file)) target.set(file, new Set());
        target.get(file).add(symbol);
      }
    }
    for (const [sourceFile, symbols] of removedByFile) {
      for (const symbol of symbols) {
        if (!addedByFile.get(sourceFile)?.has(symbol)) {
          const found = signal("export-contract-removed", sourceFile, symbol);
          signals.set(found.id, found);
        }
      }
    }
  }

  return [...signals.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function detectReleaseChange(diff, snapshots = {}) {
  const breakingSurfaces = detectBreakingSurfaceSignals(diff, snapshots);
  return {
    backwardIncompatible: breakingSurfaces.length > 0,
    removesPublicContract: breakingSurfaces.some((entry) => entry.kind === "export-contract-removed"),
    breakingSurfaces,
  };
}

function compareSemver(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function validateChangelog(content, targetVersion, now = new Date()) {
  const errors = [];
  const unreleased = [...content.matchAll(/^## \[Unreleased\]\s*$/gm)];
  if (unreleased.length !== 1) errors.push(`Expected one [Unreleased] heading, found ${unreleased.length}.`);

  const firstVersionHeading = content.match(/^## \[([^\]]+)\](?:\s+-\s+\d{4}-\d{2}-\d{2})?\s*$/m);
  if (!firstVersionHeading || firstVersionHeading[1] !== "Unreleased") {
    errors.push("[Unreleased] must be the first version heading.");
  }

  const allReleaseHeadings = [...content.matchAll(/^## \[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/gm)]
    .filter((match) => match[1] !== "Unreleased");
  const stable = [];
  const seen = new Set();
  for (const [, version, date] of allReleaseHeadings) {
    if (!STABLE_SEMVER.test(version)) {
      errors.push(`Unsupported prerelease or invalid changelog heading: ${version}.`);
      continue;
    }
    if (!date) errors.push(`Release ${version} is missing a YYYY-MM-DD date.`);
    if (seen.has(version)) errors.push(`Duplicate changelog release: ${version}.`);
    seen.add(version);
    stable.push(version);
    if (date) {
      const parsed = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
        errors.push(`Release ${version} has an invalid date: ${date}.`);
      } else if (parsed.valueOf() > now.valueOf()) {
        errors.push(`Release ${version} has a future date: ${date}.`);
      }
    }
  }

  for (let index = 1; index < stable.length; index += 1) {
    if (compareSemver(stable[index - 1], stable[index]) <= 0) {
      errors.push(`Release headings are not unique descending SemVer: ${stable[index - 1]} then ${stable[index]}.`);
    }
  }
  if (stable.length && compareSemver(targetVersion, stable[0]) < 0) {
    errors.push(`VERSION ${targetVersion} is older than latest changelog release ${stable[0]}.`);
  }
  return { errors, stableVersions: stable };
}

export function parseImpact(body) {
  const release = body.match(/^Release impact:\s*(none|patch|minor|major)\s*$/im)?.[1];
  const roadmap = body.match(/^Roadmap impact:\s*(none|add|move|remove)\s*$/im)?.[1];
  return { release, roadmap };
}

export function extractUnreleased(content) {
  const heading = /^## \[Unreleased\]\s*$/m.exec(content);
  if (!heading) return null;
  const remainder = content.slice(heading.index + heading[0].length).replace(/^\r?\n/, "");
  const nextHeading = remainder.search(/^## \[/m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;
  return section
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function extractLatestReleaseSection(content) {
  const match = /^## \[(?!Unreleased\])([^\]]+)\](?:\s+-\s+\d{4}-\d{2}-\d{2})?\s*$/m.exec(content);
  if (!match) return null;
  const version = match[1];
  const remainder = content.slice(match.index + match[0].length).replace(/^\r?\n/, "");
  const nextHeading = remainder.search(/^## \[/m);
  const body = (nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  return { version, body };
}

export function isRuntimeProductFile(file) {
  if (!/^(?:apps|packages|prisma)\//.test(file)) return false;
  if (/^(?:apps|packages)\/.*(?:^|\/)(?:tests|__tests__|e2e|DRXAppTests|DRXAppUITests)\//.test(file)) {
    return false;
  }
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) || /Tests\.swift$/.test(file)) return false;
  if (/\.mdx?$/i.test(file) || /(?:^|\/)\.env\.example$/.test(file)) return false;
  if (/^apps\/ios\/ci_scripts\/test_/.test(file)) return false;
  return true;
}

export function validateVersionIncrement(baseVersion, headVersion, impact, { baseBuild = null, headBuild = null } = {}) {
  const errors = [];
  if (!baseVersion || !headVersion || impact === "none") return errors;
  if (!STABLE_SEMVER.test(baseVersion) || !STABLE_SEMVER.test(headVersion)) return errors;

  if (compareSemver(headVersion, baseVersion) <= 0) {
    errors.push(
      `Release impact ${impact} requires VERSION (${headVersion}) to advance beyond base VERSION (${baseVersion}).`,
    );
  } else {
    const [baseMajor, baseMinor] = baseVersion.split(".").map(Number);
    const [headMajor, headMinor] = headVersion.split(".").map(Number);
    if (impact === "major" && headMajor <= baseMajor) {
      errors.push(`Release impact major requires major version to advance (${baseVersion} -> ${headVersion}).`);
    } else if (impact === "minor" && headMajor === baseMajor && headMinor <= baseMinor) {
      errors.push(`Release impact minor requires at least minor version to advance (${baseVersion} -> ${headVersion}).`);
    }
  }

  if (baseBuild !== null && headBuild !== null && Number.isInteger(baseBuild) && Number.isInteger(headBuild)) {
    if (headBuild <= baseBuild) {
      errors.push(
        `Release impact ${impact} requires native build CURRENT_PROJECT_VERSION (${headBuild}) to advance beyond ${baseBuild}.`,
      );
    }
  }
  return errors;
}

function parseProjectBuildNumber(projectYmlContent) {
  const match = projectYmlContent.match(/^\s*CURRENT_PROJECT_VERSION:\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
}

function isVersionLine(file, line) {
  if (file === "VERSION") return line.trim().length > 0;
  if (["package.json", "apps/app/package.json", "apps/mobile/package.json", "apps/mobile/app.json"].includes(file)) {
    return /^\s*"version"\s*:/.test(line);
  }
  if (file === "apps/ios/project.yml" || /\.xcodeproj\/project\.pbxproj$/.test(file)) {
    return /\b(MARKETING_VERSION|CURRENT_PROJECT_VERSION)\b/.test(line);
  }
  if ([
    "apps/app/app/(app)/settings/page.tsx",
    "apps/mobile/app/(tabs)/more.tsx",
    "apps/mobile/src/contexts/OfflineContext.tsx",
  ].includes(file)) {
    return /\b(version|nativeApplicationVersion|appPackage\.version)\b/i.test(line);
  }
  return false;
}

export function versionSurfaceEdits(diff) {
  const changed = new Set();
  let file = null;
  for (const line of diff.split("\n")) {
    const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (fileMatch) {
      file = fileMatch[2];
      continue;
    }
    if (!file || line.startsWith("+++") || line.startsWith("---")) continue;
    if ((line.startsWith("+") || line.startsWith("-")) && isVersionLine(file, line.slice(1))) {
      changed.add(file);
    }
  }
  return [...changed];
}

export function validateImpactChanges(impact, files, { baseChangelog = null, headChangelog = null, diff = "" } = {}) {
  const { baseVersion = null, headVersion = null, baseBuild = null, headBuild = null } = arguments[2] ?? {};
  const errors = [];
  const runtimeFiles = files.filter(isRuntimeProductFile);
  if (impact.release === "none" && runtimeFiles.length) {
    errors.push(
      `Release impact none cannot modify runtime product files: ${runtimeFiles.slice(0, 5).join(", ")}${runtimeFiles.length > 5 ? "..." : ""}.`,
    );
  }
  if (impact.release !== "none" && !files.includes("CHANGELOG.md")) {
    errors.push(`Release impact ${impact.release} requires a CHANGELOG.md change.`);
  }
  if (impact.release !== "none" && files.includes("CHANGELOG.md")) {
    const before = baseChangelog === null ? null : extractUnreleased(baseChangelog);
    const after = headChangelog === null ? null : extractUnreleased(headChangelog);
    const baseLatest = baseChangelog === null ? null : extractLatestReleaseSection(baseChangelog);
    const headLatest = headChangelog === null ? null : extractLatestReleaseSection(headChangelog);
    const cutNewReleaseSection =
      headLatest !== null &&
      headLatest.body.length > 0 &&
      (baseLatest === null || headLatest.version !== baseLatest.version || headLatest.body !== baseLatest.body);
    if ((before === null || after === null || before === after) && !cutNewReleaseSection) {
      errors.push(`Release impact ${impact.release} requires a substantive diff in the leading [Unreleased] section.`);
    }
  }
  const versionEdits = versionSurfaceEdits(diff);
  if (impact.release === "none" && versionEdits.length) {
    errors.push(`Release impact none cannot edit version surfaces: ${versionEdits.join(", ")}.`);
  }
  if (impact.release !== "none" && baseVersion && headVersion) {
    errors.push(...validateVersionIncrement(baseVersion, headVersion, impact.release, { baseBuild, headBuild }));
  }
  if (impact.roadmap !== "none" && !files.includes("docs/help-center-export/roadmap/customer-roadmap.md")) {
    errors.push(`Roadmap impact ${impact.roadmap} requires the canonical customer roadmap to change.`);
  }
  return errors;
}

function changedFiles(root, baseSha) {
  return execFileSync("git", ["diff", "--name-only", `${baseSha}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
}

function gitDiff(root, baseSha) {
  return execFileSync("git", ["diff", "--unified=0", `${baseSha}...HEAD`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function gitFile(root, revision, file) {
  return execFileSync("git", ["show", `${revision}:${file}`], {
    cwd: root,
    encoding: "utf8",
  });
}

function optionalGitFile(root, revision, file) {
  try {
    return execFileSync("git", ["show", `${revision}:${file}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

function optionalWorkingFile(root, file) {
  try {
    return readFileSync(join(root, file), "utf8");
  } catch {
    return "";
  }
}

function contractSnapshots(root, baseSha, files) {
  const baseFiles = {};
  const headFiles = {};
  for (const file of files.filter((entry) => /\.[cm]?[jt]sx?$/.test(entry))) {
    baseFiles[file] = optionalGitFile(root, baseSha, file);
    headFiles[file] = optionalWorkingFile(root, file);
  }
  return { baseFiles, headFiles };
}

export const BREAKING_CHANGE_REVIEW_PATH = "scripts/release/breaking-change-review.json";

export function validateBreakingSurfaceReview(root, baseSha, files, signals, declaredImpact) {
  if (!signals.length || declaredImpact === "major") return [];

  const detected = signals.map((entry) => entry.id).sort();
  const errors = [];
  if (!files.includes(BREAKING_CHANGE_REVIEW_PATH)) {
    errors.push(...validateDeclaredImpact("major", declaredImpact));
    errors.push(
      `Detected breaking-surface signals require Release impact major or a changed ${BREAKING_CHANGE_REVIEW_PATH}: ${detected.join(", ")}.`,
    );
    return errors;
  }

  let review;
  try {
    review = JSON.parse(readFileSync(join(root, BREAKING_CHANGE_REVIEW_PATH), "utf8"));
  } catch (error) {
    return [`Breaking-change review manifest is unreadable: ${error.message}`];
  }

  if (review.schemaVersion !== 1) errors.push("Breaking-change review manifest schemaVersion must be 1.");
  if (review.baseSha !== baseSha) errors.push("Breaking-change review manifest baseSha must match the pull request base SHA.");
  if (review.status !== "reviewed-compatible") {
    errors.push("Breaking-change review manifest status must be reviewed-compatible for a non-major declaration.");
  }
  if (typeof review.reviewedBy !== "string" || review.reviewedBy.trim().length < 3) {
    errors.push("Breaking-change review manifest requires reviewedBy.");
  }
  if (typeof review.reviewUrl !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+#pullrequestreview-\d+$/.test(review.reviewUrl)) {
    errors.push("Breaking-change review manifest requires a GitHub pull-request reviewUrl.");
  }
  if (typeof review.rationale !== "string" || review.rationale.trim().length < 40) {
    errors.push("Breaking-change review manifest requires a substantive compatibility rationale.");
  }
  const reviewedSignals = Array.isArray(review.signals) ? [...new Set(review.signals)].sort() : [];
  if (JSON.stringify(reviewedSignals) !== JSON.stringify(detected)) {
    errors.push(`Breaking-change review manifest signals must exactly match detected signals: ${detected.join(", ")}.`);
  }
  if (errors.length) errors.unshift(...validateDeclaredImpact("major", declaredImpact));
  return errors;
}

export function validateCiDependencyReferences(references, policy, pathExists = () => false) {
  const errors = [];
  const allowed = policy.allowedLocalMcpDependencies ?? [];
  for (const reference of references) {
    const remote = /https?:\/\/|\b(npx|uvx|docker)\b|\bpnpm\s+dlx\b/i.test(reference.command);
    const match = allowed.find(
      (entry) => entry.source === reference.source && entry.command === reference.command,
    );
    if (remote) {
      errors.push(`Opaque or ephemeral remote MCP dependency is forbidden in CI: ${reference.source}.`);
      continue;
    }
    if (!match || !match.localPath || !pathExists(match.localPath)) {
      errors.push(`MCP dependency is not an approved local repository dependency: ${reference.source}.`);
    }
  }
  return errors;
}

function collectCiMcpReferences(root) {
  const references = [];
  const workflowRoot = join(root, ".github", "workflows");
  for (const name of readdirSync(workflowRoot).filter((entry) => /\.ya?ml$/.test(entry)).sort()) {
    const relative = `.github/workflows/${name}`;
    const lines = readFileSync(join(root, relative), "utf8").split("\n");
    lines.forEach((line, index) => {
      if (/\bmcp\b|mcp[-_@/]/i.test(line)) {
        references.push({ source: `${relative}:${index + 1}`, command: line.trim() });
      }
    });
  }
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
    if (/\bmcp\b|mcp[-_@/]/i.test(command)) {
      references.push({ source: `package.json#scripts.${name}`, command });
    }
  }
  return references;
}

export function validateCiDependencyPolicy(root) {
  const policyPath = join(root, "scripts", "release", "ci-dependency-allowlist.json");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  if (policy.authority !== "local-repository") {
    return ["CI dependency policy authority must remain local-repository."];
  }
  const references = collectCiMcpReferences(root);
  return validateCiDependencyReferences(
    references,
    policy,
    (localPath) => !localPath.startsWith("/") && existsSync(join(root, localPath)),
  );
}

export function validatePullRequest(root, providedEvent = null) {
  if (!providedEvent && !process.env.GITHUB_EVENT_PATH) return [];
  const event = providedEvent ?? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (!event.pull_request) return [];

  const errors = [];
  const impact = parseImpact(event.pull_request.body ?? "");
  if (!impact.release) errors.push("Pull request must declare Release impact: none|patch|minor|major.");
  if (!impact.roadmap) errors.push("Pull request must declare Roadmap impact: none|add|move|remove.");
  if (errors.length) return errors;

  const baseSha = event.pull_request.base.sha;
  const files = changedFiles(root, baseSha);
  const diff = gitDiff(root, baseSha);
  const releaseChange = detectReleaseChange(
    diff,
    contractSnapshots(root, baseSha, files),
  );
  errors.push(...validateBreakingSurfaceReview(
    root,
    baseSha,
    files,
    releaseChange.breakingSurfaces,
    impact.release,
  ));
  const baseVersion = optionalGitFile(root, baseSha, "VERSION").trim() || null;
  const headVersion = optionalWorkingFile(root, "VERSION").trim() || null;
  const baseBuild = parseProjectBuildNumber(optionalGitFile(root, baseSha, "apps/ios/project.yml"));
  const headBuild = parseProjectBuildNumber(optionalWorkingFile(root, "apps/ios/project.yml"));
  errors.push(...validateImpactChanges(impact, files, {
    baseChangelog: gitFile(root, baseSha, "CHANGELOG.md"),
    headChangelog: readFileSync(join(root, "CHANGELOG.md"), "utf8"),
    diff,
    baseVersion,
    headVersion,
    baseBuild,
    headBuild,
  }));
  return errors;
}

export function validatePushEvent(root, providedEvent = null) {
  if (!providedEvent && !process.env.GITHUB_EVENT_PATH) return [];
  const event = providedEvent ?? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (event.pull_request || event.ref !== "refs/heads/main") return [];
  const beforeSha = event.before;
  if (!beforeSha || /^0+$/.test(beforeSha)) return [];

  const files = changedFiles(root, beforeSha);
  const runtimeFiles = files.filter(isRuntimeProductFile);
  if (!runtimeFiles.length) return [];

  const baseVersion = optionalGitFile(root, beforeSha, "VERSION").trim() || null;
  const headVersion = optionalWorkingFile(root, "VERSION").trim() || null;
  const baseBuild = parseProjectBuildNumber(optionalGitFile(root, beforeSha, "apps/ios/project.yml"));
  const headBuild = parseProjectBuildNumber(optionalWorkingFile(root, "apps/ios/project.yml"));
  return validateVersionIncrement(baseVersion, headVersion, "patch", { baseBuild, headBuild });
}

export function validateRepository(root) {
  const errors = [];
  let versionResult;
  try {
    versionResult = validateVersions(root);
    errors.push(...versionResult.errors);
  } catch (error) {
    errors.push(error.message);
  }

  const targetVersion = readFileSync(join(root, "VERSION"), "utf8").trim();
  const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  const technicalChangelog = validateChangelog(changelog, targetVersion);
  errors.push(...technicalChangelog.errors);

  const customerChangelog = readFileSync(
    join(root, "docs/help-center-export/changelog/customer-changelog.md"),
    "utf8",
  );
  const technicalReleases = new Set(technicalChangelog.stableVersions);
  const customerVersions = [];
  for (const match of customerChangelog.matchAll(/^## \d{4}-\d{2}-\d{2} — v(.+)\s*$/gm)) {
    const customerVersion = match[1];
    customerVersions.push(customerVersion);
    if (!STABLE_SEMVER.test(customerVersion)) {
      errors.push(`Customer changelog contains a non-stable release heading: ${customerVersion}.`);
    } else if (!technicalReleases.has(customerVersion)) {
      errors.push(`Customer changelog ${customerVersion} has no matching technical release section.`);
    }
  }

  const mintlifyChangelogPath = join(root, "mintlify/CHANGELOG.mdx");
  if (existsSync(mintlifyChangelogPath)) {
    const mintlifyChangelog = readFileSync(mintlifyChangelogPath, "utf8");
    const mintlifyVersions = [];
    for (const match of mintlifyChangelog.matchAll(/^## \d{4}-\d{2}-\d{2} — v(.+)\s*$/gm)) {
      const mintlifyVersion = match[1];
      mintlifyVersions.push(mintlifyVersion);
      if (!STABLE_SEMVER.test(mintlifyVersion)) {
        errors.push(`Mintlify changelog contains a non-stable release heading: ${mintlifyVersion}.`);
      } else if (!technicalReleases.has(mintlifyVersion)) {
        errors.push(`Mintlify changelog ${mintlifyVersion} has no matching technical release section.`);
      }
    }
    if (customerVersions.length && mintlifyVersions.length && customerVersions[0] !== mintlifyVersions[0]) {
      errors.push(
        `Latest customer changelog version (${customerVersions[0]}) does not match Mintlify changelog (${mintlifyVersions[0]}).`,
      );
    }
  }

  const agentPolicy = readFileSync(join(root, "AGENTS.md"), "utf8");
  if (!agentPolicy.includes(".agents/skills/release-integrity/SKILL.md")) {
    errors.push("AGENTS.md does not point affected work to the release-integrity skill.");
  }
  for (const requiredPath of [
    ".agents/skills/release-integrity/SKILL.md",
    ".agents/skills/release-integrity/agents/openai.yaml",
    ".agents/skills/release-integrity/references/artifact-map.md",
    "scripts/release/ci-dependency-allowlist.json",
  ]) {
    try {
      readFileSync(join(root, requiredPath), "utf8");
    } catch {
      errors.push(`Missing release-integrity artifact: ${requiredPath}.`);
    }
  }
  errors.push(...validateCiDependencyPolicy(root));
  errors.push(...validatePullRequest(root));
  errors.push(...validatePushEvent(root));
  return { errors, targetVersion, versionResult };
}

function main() {
  const rootIndex = process.argv.indexOf("--root");
  const root = rootIndex >= 0 ? resolve(process.argv[rootIndex + 1]) : process.cwd();
  const result = validateRepository(root);
  if (result.errors.length) {
    console.error("\nRelease integrity failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`\nRelease integrity passed for planned/current version ${result.targetVersion}.`);
  console.log("No tag, deployment, store distribution, or external publication is implied.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
