import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* eslint-env node */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(__dirname, "../..");
const WRELIK_KIT_ROOT = path.resolve(REPO_ROOT, "../wrelik-kit");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");
const APP_PACKAGE_JSON_PATH = path.join(APP_ROOT, "package.json");
const ROOT_PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function log(msg) {
  console.log(`${GREEN}==>${RESET} ${msg}`);
}

function warn(msg) {
  console.warn(`${YELLOW}⚠️ ${msg}${RESET}`);
}

function fail(msg) {
  console.error(`${RED}❌ ${msg}${RESET}`);
  process.exit(1);
}

if (!fs.existsSync(WRELIK_KIT_ROOT)) {
  fail(`wrelik-kit not found at ${WRELIK_KIT_ROOT}`);
}

log(`Cleaning old tarballs in ${PACKAGES_DIR}...`);
if (fs.existsSync(PACKAGES_DIR)) {
  const files = fs.readdirSync(PACKAGES_DIR);
  for (const file of files) {
    if (file.endsWith(".tgz")) {
      fs.unlinkSync(path.join(PACKAGES_DIR, file));
    }
  }
} else {
  fs.mkdirSync(PACKAGES_DIR, { recursive: true });
}

log("Building wrelik-kit...");
try {
  execSync("pnpm build", { cwd: WRELIK_KIT_ROOT, stdio: "inherit" });
} catch (e) {
  fail("Failed to build wrelik-kit");
}

log("Packing wrelik-kit packages...");
try {
  execSync(`pnpm -r exec pnpm pack --pack-destination "${PACKAGES_DIR}"`, {
    cwd: WRELIK_KIT_ROOT,
    stdio: "inherit",
  });
} catch (e) {
  fail(`Failed to pack wrelik-kit packages: ${e.message}`);
}

log("Updating app dependencies...");
const appPackageJson = JSON.parse(
  fs.readFileSync(APP_PACKAGE_JSON_PATH, "utf-8"),
);
const rootPackageJson = JSON.parse(
  fs.readFileSync(ROOT_PACKAGE_JSON_PATH, "utf-8"),
);
const newTarballs = fs
  .readdirSync(PACKAGES_DIR)
  .filter((f) => f.endsWith(".tgz"));
const overrides = rootPackageJson.pnpm?.overrides || {};
const dependencies = appPackageJson.dependencies || {};

let updatedCount = 0;

for (const tarball of newTarballs) {
  const match = tarball.match(/^wrelik-(.+)-(\d+\.\d+\.\d+)\.tgz$/);
  if (match) {
    const packageName = `@wrelik/${match[1]}`;
    const fileUrl = `file:../../packages/${tarball}`;

    if (dependencies[packageName]) {
      dependencies[packageName] = fileUrl;
      updatedCount++;
    }

    if (overrides[packageName]) {
      overrides[packageName] = `file:packages/${tarball}`;
    }
  }
}

appPackageJson.dependencies = dependencies;
rootPackageJson.pnpm = rootPackageJson.pnpm || {};
rootPackageJson.pnpm.overrides = overrides;

fs.writeFileSync(
  APP_PACKAGE_JSON_PATH,
  JSON.stringify(appPackageJson, null, 2) + "\n",
);
fs.writeFileSync(
  ROOT_PACKAGE_JSON_PATH,
  JSON.stringify(rootPackageJson, null, 2) + "\n",
);

if (updatedCount === 0) {
  warn("No dependencies updated in the app package.json.");
}

log(`Updated ${updatedCount} dependencies in apps/app/package.json.`);

log("Done! Run `pnpm install` to apply changes.");
