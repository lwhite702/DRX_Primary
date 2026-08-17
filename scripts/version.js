#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const ROOT_PACKAGE_JSON = path.join(root, "package.json");
const APP_PACKAGE_JSON = path.join(root, "apps", "app", "package.json");
const MOBILE_PACKAGE_JSON = path.join(root, "apps", "mobile", "package.json");
const MOBILE_APP_JSON = path.join(root, "apps", "mobile", "app.json");
const IOS_PROJECT_YML = path.join(root, "apps", "ios", "project.yml");
const IOS_PBXPROJ = path.join(
  root,
  "apps",
  "ios",
  "DRXApp.xcodeproj",
  "project.pbxproj",
);
const VERSION_FILE = path.join(root, "VERSION");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function parseSemver(version) {
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      version,
    );
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function nativeMarketingVersion(version) {
  const parsed = parseSemver(version);
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

function readBuildSetting(filePath, setting, separator) {
  const contents = fs.readFileSync(filePath, "utf8");
  const pattern =
    separator === ":"
      ? new RegExp(`^\\s*${setting}:\\s*["']?([^"'\\s#]+)`, "gm")
      : new RegExp(`\\b${setting} = ([^;]+);`, "g");
  const values = [...contents.matchAll(pattern)].map((match) =>
    match[1].trim(),
  );
  if (values.length === 0) {
    throw new Error(`Missing ${setting} in ${path.relative(root, filePath)}`);
  }
  const unique = [...new Set(values)];
  if (unique.length !== 1) {
    throw new Error(
      `Inconsistent ${setting} values in ${path.relative(root, filePath)}: ${unique.join(", ")}`,
    );
  }
  return unique[0];
}

function replaceBuildSetting(filePath, setting, value, separator) {
  const contents = fs.readFileSync(filePath, "utf8");
  const pattern =
    separator === ":"
      ? new RegExp(`^(\\s*${setting}:\\s*)[^\\s#]+`, "gm")
      : new RegExp(`(\\b${setting} = )[^;]+;`, "g");
  const updated = contents.replace(
    pattern,
    `$1${value}${separator === "=" ? ";" : ""}`,
  );
  if (updated === contents) {
    if (readBuildSetting(filePath, setting, separator) === value) return;
    throw new Error(
      `Unable to update ${setting} in ${path.relative(root, filePath)}`,
    );
  }
  fs.writeFileSync(filePath, updated);
}

function readVersions() {
  return {
    rootPkg: readJson(ROOT_PACKAGE_JSON),
    appPkg: readJson(APP_PACKAGE_JSON),
    mobilePkg: readJson(MOBILE_PACKAGE_JSON),
    mobileApp: readJson(MOBILE_APP_JSON),
    versionFile: fs.existsSync(VERSION_FILE)
      ? fs.readFileSync(VERSION_FILE, "utf8").trim()
      : "",
    iosProjectMarketing: readBuildSetting(
      IOS_PROJECT_YML,
      "MARKETING_VERSION",
      ":",
    ),
    iosProjectBuild: readBuildSetting(
      IOS_PROJECT_YML,
      "CURRENT_PROJECT_VERSION",
      ":",
    ),
    iosPbxMarketing: readBuildSetting(IOS_PBXPROJ, "MARKETING_VERSION", "="),
    iosPbxBuild: readBuildSetting(IOS_PBXPROJ, "CURRENT_PROJECT_VERSION", "="),
  };
}

function bumpSemver(version, type) {
  const parsed = parseSemver(version);
  if (type === "major") return `${parsed.major + 1}.0.0`;
  if (type === "minor") return `${parsed.major}.${parsed.minor + 1}.0`;
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function checkVersions() {
  const versions = readVersions();
  const rootVersion = String(versions.rootPkg.version || "");
  const appVersion = String(versions.appPkg.version || "");
  const mobileVersion = String(versions.mobilePkg.version || "");
  const expoVersion = String(versions.mobileApp.expo?.version || "");
  const expectedNativeVersion = nativeMarketingVersion(rootVersion);

  console.log(`root package.json version: ${rootVersion}`);
  console.log(`apps/app/package.json version: ${appVersion}`);
  console.log(`apps/mobile/package.json version: ${mobileVersion}`);
  console.log(`VERSION file: ${versions.versionFile || "(missing)"}`);
  console.log(`Expo/native marketing version: ${expoVersion}`);
  console.log(
    `iOS marketing/build version: ${versions.iosProjectMarketing} (${versions.iosProjectBuild})`,
  );

  const mismatches = [];
  for (const [label, value] of [
    ["apps/app/package.json", appVersion],
    ["apps/mobile/package.json", mobileVersion],
    ["VERSION", versions.versionFile],
  ]) {
    if (value !== rootVersion) {
      mismatches.push(
        `${label} (${value || "(missing)"}) != root package.json (${rootVersion})`,
      );
    }
  }
  for (const [label, value] of [
    ["apps/mobile/app.json", expoVersion],
    ["apps/ios/project.yml", versions.iosProjectMarketing],
    ["apps/ios/DRXApp.xcodeproj/project.pbxproj", versions.iosPbxMarketing],
  ]) {
    if (value !== expectedNativeVersion) {
      mismatches.push(
        `${label} marketing version (${value}) != ${expectedNativeVersion}`,
      );
    }
  }
  if (versions.iosProjectBuild !== versions.iosPbxBuild) {
    mismatches.push(
      `iOS build number drift: project.yml (${versions.iosProjectBuild}) != project.pbxproj (${versions.iosPbxBuild})`,
    );
  }

  if (mismatches.length > 0) {
    console.log("\nVersion mismatch detected:");
    for (const mismatch of mismatches) console.log(`- ${mismatch}`);
    process.exit(1);
  }

  console.log("\nVersion consistency check passed.");
}

function setVersions(nextVersion) {
  parseSemver(nextVersion);
  const { rootPkg, appPkg, mobilePkg, mobileApp } = readVersions();
  const nativeVersion = nativeMarketingVersion(nextVersion);

  rootPkg.version = nextVersion;
  appPkg.version = nextVersion;
  mobilePkg.version = nextVersion;
  mobileApp.expo.version = nativeVersion;
  writeJson(ROOT_PACKAGE_JSON, rootPkg);
  writeJson(APP_PACKAGE_JSON, appPkg);
  writeJson(MOBILE_PACKAGE_JSON, mobilePkg);
  writeJson(MOBILE_APP_JSON, mobileApp);
  fs.writeFileSync(VERSION_FILE, `${nextVersion}\n`);
  replaceBuildSetting(IOS_PROJECT_YML, "MARKETING_VERSION", nativeVersion, ":");
  replaceBuildSetting(IOS_PBXPROJ, "MARKETING_VERSION", nativeVersion, "=");

  console.log(
    `Set package version to ${nextVersion} and native marketing version to ${nativeVersion}`,
  );
}

function bumpVersions() {
  const type = process.argv[3] || "patch";
  if (!["major", "minor", "patch"].includes(type)) {
    console.error("Usage: node scripts/version.js bump [major|minor|patch]");
    process.exit(1);
  }
  const { rootPkg, versionFile } = readVersions();
  const sourceVersion = String(rootPkg.version || versionFile || "");
  const nextVersion = bumpSemver(sourceVersion, type);
  setVersions(nextVersion);
  console.log(`Bumped version ${sourceVersion} -> ${nextVersion} (${type})`);
}

const command = process.argv[2];
if (command === "check") {
  checkVersions();
} else if (command === "bump") {
  bumpVersions();
} else if (command === "set" && process.argv[3]) {
  setVersions(process.argv[3]);
} else {
  console.log("Usage:");
  console.log("  node scripts/version.js check");
  console.log("  node scripts/version.js bump [major|minor|patch]");
  console.log("  node scripts/version.js set <semver>");
  process.exit(1);
}
