import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* eslint-env node */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRX_ROOT = path.resolve(__dirname, "..");
const WRELIK_KIT_ROOT = path.resolve(DRX_ROOT, "../wrelik-kit");
const PACKAGES_DIR = path.join(DRX_ROOT, "packages");
const PACKAGE_JSON_PATH = path.join(DRX_ROOT, "package.json");

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

// 1. Clean old tarballs
log(`Cleaning old tarballs in ${PACKAGES_DIR}...`);
if (fs.existsSync(PACKAGES_DIR)) {
  const files = fs.readdirSync(PACKAGES_DIR);
  for (const file of files) {
    if (file.endsWith(".tgz")) {
      fs.unlinkSync(path.join(PACKAGES_DIR, file));
    }
  }
} else {
  fs.mkdirSync(PACKAGES_DIR);
}

// 2. Build wrelik-kit
log("Building wrelik-kit...");
try {
  execSync("pnpm build", { cwd: WRELIK_KIT_ROOT, stdio: "inherit" });
} catch (e) {
  fail("Failed to build wrelik-kit");
}

// 3. Pack wrelik-kit packages
log("Packing wrelik-kit packages...");
try {
  // Use pnpm -r exec to run pack in each package
  // We need to target the output to PACKAGES_DIR
  // pnpm pack --pack-destination is supported in newer pnpm versions
  execSync(`pnpm -r exec pnpm pack --pack-destination "${PACKAGES_DIR}"`, {
    cwd: WRELIK_KIT_ROOT,
    stdio: "inherit",
  });
} catch (e) {
  fail(`Failed to pack wrelik-kit packages: ${e.message}`);
}

// 4. Update package.json dependencies
log("Updating package.json dependencies...");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
const newTarballs = fs
  .readdirSync(PACKAGES_DIR)
  .filter((f) => f.endsWith(".tgz"));
const overrides = packageJson.pnpm?.overrides || {};
const dependencies = packageJson.dependencies || {};

let updatedCount = 0;

for (const tarball of newTarballs) {
  // Extract package name from tarball filename convention: wrelik-auth-0.1.1.tgz -> @wrelik/auth
  // This depends on the naming convention. Usually: name-version.tgz
  // Scoped packages like @wrelik/auth might pack to wrelik-auth-0.1.1.tgz

  // Heuristic: match wrelik-(name)-(version).tgz
  const match = tarball.match(/^wrelik-(.+)-(\d+\.\d+\.\d+)\.tgz$/);
  if (match) {
    const packageName = `@wrelik/${match[1]}`;
    const fileUrl = `file:./packages/${tarball}`;

    if (dependencies[packageName]) {
      dependencies[packageName] = fileUrl;
      updatedCount++;
    }

    if (overrides[packageName]) {
      overrides[packageName] = fileUrl;
    }
  }
}

packageJson.dependencies = dependencies;
if (packageJson.pnpm) {
  packageJson.pnpm.overrides = overrides;
}

fs.writeFileSync(
  PACKAGE_JSON_PATH,
  JSON.stringify(packageJson, null, 2) + "\n",
);
log(`Updated ${updatedCount} dependencies in package.json.`);

log("Done! Run `pnpm install` to apply changes.");
