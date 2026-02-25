import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PACKAGE_JSON_PATH = path.join(APP_ROOT, "package.json");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function fail(msg) {
  console.error(`${RED}❌ ${msg}${RESET}`);
  process.exit(1);
}

function success(msg) {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

if (!fs.existsSync(PACKAGE_JSON_PATH)) {
  fail("package.json not found");
}

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...(rootPackageJson.pnpm?.overrides || {}),
};

const declaredTarballs = [];

for (const [name, version] of Object.entries(dependencies)) {
  if (typeof version !== "string") {
    continue;
  }

  const match = version.match(/^file:(.+packages\/[^/]+\.tgz)$/);
  if (match) {
    declaredTarballs.push({
      name,
      version,
      path: match[1],
    });
  }
}

if (declaredTarballs.length === 0) {
  console.warn("⚠️ No local tarball dependencies found.");
  process.exit(0);
}

console.log(`Checking ${declaredTarballs.length} local tarball references...`);

for (const dep of declaredTarballs) {
  const baseDir = dep.path.startsWith("packages/") ? REPO_ROOT : APP_ROOT;
  const tarballPath = path.resolve(baseDir, dep.path);

  if (!fs.existsSync(tarballPath)) {
    fail(`Missing tarball for ${dep.name}: ${dep.path} does not exist on disk.`);
  }
}

if (fs.existsSync(PACKAGES_DIR)) {
  const files = fs.readdirSync(PACKAGES_DIR).filter((f) => f.endsWith(".tgz"));
  const referencedFiles = new Set(
    declaredTarballs.map((d) => path.basename(d.path)),
  );

  for (const file of files) {
    if (!referencedFiles.has(file)) {
      console.warn(
        `⚠️ Warning: ${file} exists in packages/ but is not referenced in package.json`,
      );
    }
  }
}

success("All referenced tarballs exist.");
