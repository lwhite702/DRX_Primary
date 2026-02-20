#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const ROOT_PACKAGE_JSON = path.join(root, "package.json");
const APP_PACKAGE_JSON = path.join(root, "apps", "app", "package.json");
const VERSION_FILE = path.join(root, "VERSION");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function readVersions() {
  const rootPkg = readJson(ROOT_PACKAGE_JSON);
  const appPkg = readJson(APP_PACKAGE_JSON);
  const versionFile = fs.existsSync(VERSION_FILE)
    ? fs.readFileSync(VERSION_FILE, "utf8").trim()
    : "";
  return { rootPkg, appPkg, versionFile };
}

function parseSemver(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`Invalid semver: ${version}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function bumpSemver(version, type) {
  const v = parseSemver(version);
  if (type === "major") return `${v.major + 1}.0.0`;
  if (type === "minor") return `${v.major}.${v.minor + 1}.0`;
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

function checkVersions() {
  const { rootPkg, appPkg, versionFile } = readVersions();
  const rootVersion = String(rootPkg.version || "");
  const appVersion = String(appPkg.version || "");

  console.log(`root package.json version: ${rootVersion}`);
  console.log(`apps/app/package.json version: ${appVersion}`);
  console.log(`VERSION file: ${versionFile || "(missing)"}`);

  const mismatches = [];
  if (rootVersion !== appVersion) {
    mismatches.push(`root package.json (${rootVersion}) != apps/app/package.json (${appVersion})`);
  }
  if (!versionFile || versionFile !== rootVersion) {
    mismatches.push(`VERSION (${versionFile || "(missing)"}) != root package.json (${rootVersion})`);
  }

  if (mismatches.length > 0) {
    console.log("");
    console.log("Version mismatch detected:");
    for (const mismatch of mismatches) console.log(`- ${mismatch}`);
    process.exit(1);
  }

  console.log("");
  console.log("Version consistency check passed.");
}

function bumpVersions() {
  const type = process.argv[3] || "patch";
  if (!["major", "minor", "patch"].includes(type)) {
    console.error("Usage: node scripts/version.js bump [major|minor|patch]");
    process.exit(1);
  }

  const { rootPkg, appPkg, versionFile } = readVersions();
  const sourceVersion = String(rootPkg.version || versionFile || "");
  const nextVersion = bumpSemver(sourceVersion, type);
  rootPkg.version = nextVersion;
  appPkg.version = nextVersion;
  writeJson(ROOT_PACKAGE_JSON, rootPkg);
  writeJson(APP_PACKAGE_JSON, appPkg);
  fs.writeFileSync(VERSION_FILE, `${nextVersion}\n`);

  console.log(`Bumped version ${sourceVersion} -> ${nextVersion} (${type})`);
}

const command = process.argv[2];
if (command === "check") {
  checkVersions();
} else if (command === "bump") {
  bumpVersions();
} else {
  console.log("Usage:");
  console.log("  node scripts/version.js check");
  console.log("  node scripts/version.js bump [major|minor|patch]");
  process.exit(1);
}
