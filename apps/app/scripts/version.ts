#!/usr/bin/env node

/**
 * Version Management Helper
 *
 * This script helps determine the next version number based on
 * changes in the CHANGELOG.md [Unreleased] section.
 *
 * Usage:
 *   npx tsx scripts/version.ts check    - Suggest next version
 *   npx tsx scripts/version.ts bump     - Update version and CHANGELOG
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_JSON_PATH = path.join(__dirname, "../package.json");
const CHANGELOG_PATH = path.join(__dirname, "../CHANGELOG.md");
const VERSION_FILE_PATH = path.join(__dirname, "../VERSION");

// Read VERSION file as source of truth per Wrelik Brands Versioning Protocol
const CURRENT_VERSION = fs.readFileSync(VERSION_FILE_PATH, "utf-8").trim();

interface VersionParts {
  major: number;
  minor: number;
  patch: number;
}

interface AnalysisResult {
  hasChanges: boolean;
  bumpType: "major" | "minor" | "patch";
  hasBreaking: boolean;
  hasAdded: boolean;
  hasFixed: boolean;
  content: string;
}

function parseVersion(version: string): VersionParts {
  const [major, minor, patch] = version.split(".").map(Number);
  return { major, minor, patch };
}

function incrementVersion(
  current: string,
  type: "major" | "minor" | "patch",
): string {
  const v = parseVersion(current);

  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
}

function analyzeChangelog(): AnalysisResult {
  const changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8");

  // Extract [Unreleased] section
  const unreleasedMatch = changelog.match(
    /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/,
  );

  if (!unreleasedMatch) {
    return {
      hasChanges: false,
      bumpType: "patch",
      hasBreaking: false,
      hasAdded: false,
      hasFixed: false,
      content: "",
    };
  }

  const unreleased = unreleasedMatch[1];

  // Check for breaking changes or major features
  const hasBreaking = /### Removed|### Changed.*breaking|BREAKING/i.test(
    unreleased,
  );
  const hasAdded = /### Added/i.test(unreleased);
  const hasFixed = /### Fixed/i.test(unreleased);

  // Determine version bump type
  let bumpType: "major" | "minor" | "patch" = "patch"; // default

  if (hasBreaking) {
    bumpType = "major";
  } else if (hasAdded) {
    bumpType = "minor";
  }

  return {
    hasChanges: true,
    bumpType,
    hasBreaking,
    hasAdded,
    hasFixed,
    content: unreleased,
  };
}

function suggestVersion() {
  console.log(`\n📦 Current version: v${CURRENT_VERSION}\n`);

  const analysis = analyzeChangelog();

  if (!analysis.hasChanges) {
    console.log("✅ No unreleased changes found in CHANGELOG.md");
    return;
  }

  console.log("📋 Unreleased changes detected:");
  if (analysis.hasBreaking) console.log("  🔴 Breaking changes (MAJOR)");
  if (analysis.hasAdded) console.log("  🟢 New features (MINOR)");
  if (analysis.hasFixed) console.log("  🔵 Bug fixes (PATCH)");

  const suggested = incrementVersion(CURRENT_VERSION, analysis.bumpType);

  console.log(`\n💡 Suggested version: v${suggested}`);
  console.log(`   (${analysis.bumpType.toUpperCase()} bump)\n`);

  console.log("To release:");
  console.log(`  1. Run: npx tsx scripts/version.ts bump`);
  console.log(`  2. Review changes in package.json and CHANGELOG.md`);
  console.log(`  3. Commit: git commit -m "chore: Release v${suggested}"`);
  console.log(`  4. Tag: git tag v${suggested}`);
  console.log(`  5. Push: git push origin main --tags\n`);
}

function bumpVersion() {
  const analysis = analyzeChangelog();

  if (!analysis.hasChanges) {
    console.log("❌ No unreleased changes to release");
    process.exit(1);
  }

  const newVersion = incrementVersion(CURRENT_VERSION, analysis.bumpType);
  const today = new Date().toISOString().split("T")[0];

  // Update VERSION file (single source of truth)
  fs.writeFileSync(VERSION_FILE_PATH, newVersion + "\n");

  // Update package.json
  const pj = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  pj.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pj, null, 2) + "\n");

  // Update CHANGELOG.md
  let changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  changelog = changelog.replace(
    /## \[Unreleased\]/,
    `## [Unreleased]\n\n## [${newVersion}] - ${today}`,
  );
  fs.writeFileSync(CHANGELOG_PATH, changelog);

  // Update UI components
  updateUIVersions(newVersion);

  console.log(`\n✅ Version bumped to v${newVersion}`);
  console.log(`   Updated: VERSION, package.json, CHANGELOG.md, UI components\n`);
}

function updateUIVersions(version: string) {
  const filesToUpdate = [
    "../components/layout/sidebar.tsx",
    "../components/layout/bottom-nav.tsx",
    "../app/(app)/admin/page.tsx",
    "../components/layout/footer.tsx",
    "../app/(app)/settings/page.tsx",
  ];

  filesToUpdate.forEach((relativePath) => {
    const filePath = path.join(__dirname, relativePath);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found, skipping version update: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const updatedContent = content.replace(/v\d+\.\d+\.\d+/, `v${version}`);

    if (content === updatedContent) {
      console.warn(`⚠️ No version string found to update in: ${filePath}`);
    } else {
      fs.writeFileSync(filePath, updatedContent);
    }
  });
}

// Main
const command = process.argv[2];

switch (command) {
  case "check":
    suggestVersion();
    break;
  case "bump":
    bumpVersion();
    break;
  default:
    console.log("Usage:");
    console.log("  npx tsx scripts/version.ts check  - Suggest next version");
    console.log(
      "  npx tsx scripts/version.ts bump   - Update version and CHANGELOG",
    );
}
