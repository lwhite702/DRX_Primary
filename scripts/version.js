#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseArgs(argv) {
  const args = [...argv];
  const rootIndex = args.indexOf("--root");
  let root = path.resolve(__dirname, "..");
  if (rootIndex >= 0) {
    root = path.resolve(args[rootIndex + 1]);
    args.splice(rootIndex, 2);
  }
  return { root, command: args[0], value: args[1] };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function requireStableSemver(version) {
  if (!SEMVER.test(version)) {
    throw new Error(`Expected stable MAJOR.MINOR.PATCH version, received: ${version}`);
  }
  return version;
}

function increment(version, impact) {
  const match = SEMVER.exec(requireStableSemver(version));
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (impact === "major") return `${major + 1}.0.0`;
  if (impact === "minor") return `${major}.${minor + 1}.0`;
  if (impact === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Expected bump impact major, minor, or patch; received: ${impact}`);
}

function files(root) {
  return {
    version: path.join(root, "VERSION"),
    rootPackage: path.join(root, "package.json"),
    webPackage: path.join(root, "apps", "app", "package.json"),
    mobilePackage: path.join(root, "apps", "mobile", "package.json"),
    expo: path.join(root, "apps", "mobile", "app.json"),
    eas: path.join(root, "apps", "mobile", "eas.json"),
    iosProjectYml: path.join(root, "apps", "ios", "project.yml"),
    iosPbxproj: path.join(root, "apps", "ios", "DRXApp.xcodeproj", "project.pbxproj"),
    webSettings: path.join(root, "apps", "app", "app", "(app)", "settings", "page.tsx"),
    mobileMore: path.join(root, "apps", "mobile", "app", "(tabs)", "more.tsx"),
    mobileOffline: path.join(root, "apps", "mobile", "src", "contexts", "OfflineContext.tsx"),
  };
}

function requireFiles(paths) {
  const missing = Object.entries(paths)
    .filter(([, filePath]) => !fs.existsSync(filePath))
    .map(([name, filePath]) => `${name}: ${filePath}`);
  if (missing.length) throw new Error(`Required version surfaces are missing:\n- ${missing.join("\n- ")}`);
}

function collect(root) {
  const surfaceFiles = files(root);
  requireFiles(surfaceFiles);
  const target = fs.readFileSync(surfaceFiles.version, "utf8").trim();
  requireStableSemver(target);

  const rootPackage = readJson(surfaceFiles.rootPackage);
  const webPackage = readJson(surfaceFiles.webPackage);
  const mobilePackage = readJson(surfaceFiles.mobilePackage);
  const expo = readJson(surfaceFiles.expo);
  const eas = readJson(surfaceFiles.eas);
  const projectYml = fs.readFileSync(surfaceFiles.iosProjectYml, "utf8");
  const pbxproj = fs.readFileSync(surfaceFiles.iosPbxproj, "utf8");

  const projectMarketing = [...projectYml.matchAll(/^\s*MARKETING_VERSION:\s*([^\s#]+)\s*$/gm)].map((m) => m[1]);
  const pbxMarketing = [...pbxproj.matchAll(/^\s*MARKETING_VERSION = ([^;]+);\s*$/gm)].map((m) => m[1]);
  const projectBuilds = [...projectYml.matchAll(/^\s*CURRENT_PROJECT_VERSION:\s*([^\s#]+)\s*$/gm)].map((m) => m[1]);
  const pbxBuilds = [...pbxproj.matchAll(/^\s*CURRENT_PROJECT_VERSION = ([^;]+);\s*$/gm)].map((m) => m[1]);

  return {
    target,
    surfaceFiles,
    versions: [
      ["VERSION", target],
      ["root package.json", String(rootPackage.version ?? "")],
      ["apps/app/package.json", String(webPackage.version ?? "")],
      ["apps/mobile/package.json", String(mobilePackage.version ?? "")],
      ["apps/mobile/app.json", String(expo.expo?.version ?? "")],
      ...projectMarketing.map((value, index) => [`apps/ios/project.yml MARKETING_VERSION #${index + 1}`, value]),
      ...pbxMarketing.map((value, index) => [`Xcode MARKETING_VERSION #${index + 1}`, value]),
    ],
    builds: [
      ...projectBuilds.map((value, index) => [`apps/ios/project.yml CURRENT_PROJECT_VERSION #${index + 1}`, value]),
      ...pbxBuilds.map((value, index) => [`Xcode CURRENT_PROJECT_VERSION #${index + 1}`, value]),
    ],
    expo,
    eas,
  };
}

function validate(root, { quiet = false } = {}) {
  const data = collect(root);
  const errors = [];
  const warnings = [];

  if (data.versions.length < 7) {
    errors.push("All package, Expo, project.yml, and Xcode marketing-version surfaces were not found.");
  }
  for (const [name, version] of data.versions) {
    if (!SEMVER.test(version)) errors.push(`${name} is not stable SemVer: ${version || "(missing)"}`);
    else if (version !== data.target) errors.push(`${name} (${version}) != VERSION (${data.target})`);
  }

  if (data.builds.length < 3) errors.push("All iOS build-number surfaces were not found.");
  const buildValues = new Set(data.builds.map(([, value]) => value));
  if (buildValues.size > 1) errors.push(`iOS CURRENT_PROJECT_VERSION values disagree: ${[...buildValues].join(", ")}`);
  for (const [name, value] of data.builds) {
    if (!/^[1-9]\d*$/.test(value)) errors.push(`${name} must be a positive integer: ${value}`);
  }

  if (data.eas.cli?.appVersionSource !== "remote") {
    errors.push("apps/mobile/eas.json must keep cli.appVersionSource set to remote.");
  }
  if (data.expo.expo?.android?.versionCode !== undefined) {
    errors.push("apps/mobile/app.json must not guess Android versionCode while EAS owns it remotely.");
  }

  const runtimeFiles = [
    ["web settings", data.surfaceFiles.webSettings],
    ["mobile More", data.surfaceFiles.mobileMore],
    ["mobile offline metadata", data.surfaceFiles.mobileOffline],
  ];
  for (const [name, filePath] of runtimeFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    if (/\bv?\d+\.\d+\.\d+\b/.test(content)) {
      errors.push(`${name} embeds a SemVer literal; render package or native application metadata instead.`);
    }
  }

  warnings.push(
    "The next iOS build number and Android remote versionCode require current App Store Connect/TestFlight and EAS/Play evidence before submission.",
  );
  warnings.push(
    "Repository consistency does not prove that lowering iOS marketing version from a previously submitted build is accepted; verify the highest provider-side version before archive/upload.",
  );

  if (!quiet) {
    console.log(`Product version source: ${data.target}`);
    for (const [name, version] of data.versions.slice(1)) console.log(`- ${name}: ${version}`);
    for (const [name, value] of data.builds) console.log(`- ${name}: ${value}`);
    for (const warning of warnings) console.warn(`[version] warning: ${warning}`);
  }
  return { ...data, errors, warnings };
}

function replaceAllVersionAssignments(content, pattern, version, label) {
  let count = 0;
  const updated = content.replace(pattern, (...args) => {
    count += 1;
    const groups = args.at(-1);
    return `${groups.prefix}${version}${groups.suffix ?? ""}`;
  });
  if (count === 0) throw new Error(`No ${label} assignments found.`);
  return updated;
}

function bumpBuild(root, nextBuild) {
  const surfaceFiles = files(root);
  requireFiles(surfaceFiles);
  const data = collect(root);
  const currentBuild = Number(data.builds[0][1]);
  const targetBuild = nextBuild !== undefined ? Number(nextBuild) : currentBuild + 1;
  if (!Number.isInteger(targetBuild) || targetBuild <= 0) {
    throw new Error(`Expected positive integer build number, received: ${nextBuild}`);
  }

  const yml = fs.readFileSync(surfaceFiles.iosProjectYml, "utf8");
  fs.writeFileSync(
    surfaceFiles.iosProjectYml,
    replaceAllVersionAssignments(
      yml,
      /^(?<prefix>\s*CURRENT_PROJECT_VERSION:\s*)[^\s#]+(?<suffix>\s*)$/gm,
      String(targetBuild),
      "project.yml CURRENT_PROJECT_VERSION",
    ),
  );
  const pbxproj = fs.readFileSync(surfaceFiles.iosPbxproj, "utf8");
  fs.writeFileSync(
    surfaceFiles.iosPbxproj,
    replaceAllVersionAssignments(
      pbxproj,
      /^(?<prefix>\s*CURRENT_PROJECT_VERSION = )[^;]+(?<suffix>;\s*)$/gm,
      String(targetBuild),
      "Xcode CURRENT_PROJECT_VERSION",
    ),
  );

  console.log(`Updated native build identifier to ${targetBuild}.`);
  return targetBuild;
}

function prepare(root, version, { autoBumpBuild = false, nextBuild } = {}) {
  requireStableSemver(version);
  const surfaceFiles = files(root);
  requireFiles(surfaceFiles);

  fs.writeFileSync(surfaceFiles.version, `${version}\n`);
  for (const filePath of [surfaceFiles.rootPackage, surfaceFiles.webPackage, surfaceFiles.mobilePackage]) {
    const json = readJson(filePath);
    json.version = version;
    writeJson(filePath, json);
  }
  const expo = readJson(surfaceFiles.expo);
  expo.expo.version = version;
  writeJson(surfaceFiles.expo, expo);

  const yml = fs.readFileSync(surfaceFiles.iosProjectYml, "utf8");
  fs.writeFileSync(
    surfaceFiles.iosProjectYml,
    replaceAllVersionAssignments(
      yml,
      /^(?<prefix>\s*MARKETING_VERSION:\s*)[^\s#]+(?<suffix>\s*)$/gm,
      version,
      "project.yml MARKETING_VERSION",
    ),
  );
  const pbxproj = fs.readFileSync(surfaceFiles.iosPbxproj, "utf8");
  fs.writeFileSync(
    surfaceFiles.iosPbxproj,
    replaceAllVersionAssignments(
      pbxproj,
      /^(?<prefix>\s*MARKETING_VERSION = )[^;]+(?<suffix>;\s*)$/gm,
      version,
      "Xcode MARKETING_VERSION",
    ),
  );

  let buildMsg = "Native build identifiers were not changed.";
  if (autoBumpBuild) {
    const newBuild = bumpBuild(root, nextBuild);
    buildMsg = `Native build identifier updated to ${newBuild}.`;
  }

  console.log(`Prepared product version ${version}. ${buildMsg}`);
  console.log("This is planned release metadata, not evidence that the version was released.");
}

function main() {
  const { root, command, value } = parseArgs(process.argv.slice(2));
  try {
    if (command === "check") {
      const result = validate(root);
      if (result.errors.length) {
        console.error("\nVersion integrity failed:");
        for (const error of result.errors) console.error(`- ${error}`);
        process.exit(1);
      }
      console.log("\nVersion integrity passed.");
      return;
    }
    if (command === "prepare") {
      prepare(root, value);
      return;
    }
    if (command === "bump") {
      const current = fs.readFileSync(files(root).version, "utf8").trim();
      prepare(root, increment(current, value ?? "patch"), { autoBumpBuild: true });
      return;
    }
    if (command === "bump-build") {
      bumpBuild(root, value ? Number(value) : undefined);
      return;
    }
    console.log("Usage:");
    console.log("  node scripts/version.js check [--root PATH]");
    console.log("  node scripts/version.js prepare X.Y.Z [--root PATH]");
    console.log("  node scripts/version.js bump [major|minor|patch] [--root PATH]");
    console.log("  node scripts/version.js bump-build [N] [--root PATH]");
    process.exit(1);
  } catch (error) {
    console.error(`[version] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { SEMVER, collect, increment, prepare, requireStableSemver, validate };
