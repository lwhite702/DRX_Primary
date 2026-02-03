import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_JSON_PATH = path.join(__dirname, "../package.json");
const PACKAGES_DIR = path.join(__dirname, "../packages");

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
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...(packageJson.pnpm?.overrides || {}),
};

const declaredTarballs = [];

// 1. Find all dependencies pointing to file:./packages/*.tgz
for (const [name, version] of Object.entries(dependencies)) {
  if (version.startsWith("file:./packages/") && version.endsWith(".tgz")) {
    declaredTarballs.push({
      name,
      version,
      path: version.replace("file:", ""),
    });
  }
}

if (declaredTarballs.length === 0) {
  console.warn("⚠️ No local tarball dependencies found.");
  process.exit(0);
}

console.log(`Checking ${declaredTarballs.length} local tarball references...`);

// 2. Verify existence and integrity
for (const dep of declaredTarballs) {
  const tarballPath = path.join(__dirname, "..", dep.path);

  if (!fs.existsSync(tarballPath)) {
    fail(
      `Missing tarball for ${dep.name}: ${dep.path} does not exist on disk.`,
    );
  }

  // Optional: Check if filename matches a regex or version pattern if desired
  // const filename = path.basename(tarballPath);

  // Future: Could extract package.json from tarball and verify name/version matches
}

// 3. Check for unreferenced tarballs in packages/ directory
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
