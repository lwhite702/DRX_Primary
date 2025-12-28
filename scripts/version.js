#!/usr/bin/env node
/* eslint-env node, commonjs */
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */

/**
 * Version Management Helper
 *
 * This script helps determine the next version number based on
 * changes in the CHANGELOG.md [Unreleased] section.
 *
 * Usage:
 *   node scripts/version.js check    - Suggest next version
 *   node scripts/version.js bump     - Update version and CHANGELOG
 */

const fs = require("fs");
const path = require("path");

const CURRENT_VERSION = require("../package.json").version;
const CHANGELOG_PATH = path.join(__dirname, "../CHANGELOG.md");

function parseVersion(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return { major, minor, patch };
}

function incrementVersion(current, type) {
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

function analyzeChangelog() {
  const changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8");

  // Extract [Unreleased] section
  const unreleasedMatch = changelog.match(
    /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/
  );

  if (!unreleasedMatch) {
    return { hasChanges: false };
  }

  const unreleased = unreleasedMatch[1];

  // Check for breaking changes or major features
  const hasBreaking = /### Removed|### Changed.*breaking|BREAKING/i.test(
    unreleased
  );
  const hasAdded = /### Added/i.test(unreleased);
  const hasFixed = /### Fixed/i.test(unreleased);

  // Determine version bump type
  let bumpType = "patch"; // default

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
  console.log(`  1. Run: node scripts/version.js bump`);
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

  // Update package.json
  const packageJson = require("../package.json");
  packageJson.version = newVersion;
  fs.writeFileSync(
    path.join(__dirname, "../package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  );

  // Update CHANGELOG.md
  let changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  changelog = changelog.replace(
    /## \[Unreleased\]/,
    `## [Unreleased]\n\n## [${newVersion}] - ${today}`
  );
  fs.writeFileSync(CHANGELOG_PATH, changelog);

  // Update UI components
  updateUIVersions(newVersion);

  console.log(`\n✅ Version bumped to v${newVersion}`);
  console.log(`   Updated: package.json, CHANGELOG.md, UI components\n`);
}

function updateUIVersions(version) {
  const filesToUpdate = [
    "../components/layout/sidebar.tsx",
    "../components/layout/bottom-nav.tsx",
  ];

  filesToUpdate.forEach((relativePath) => {
    const filePath = path.join(__dirname, relativePath);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found, skipping version update: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, "utf-8");
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
    console.log("  node scripts/version.js check  - Suggest next version");
    console.log(
      "  node scripts/version.js bump   - Update version and CHANGELOG"
    );
}
