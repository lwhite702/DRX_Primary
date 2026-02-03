import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* eslint-env node */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_JSON_PATH = path.join(__dirname, "../package.json");

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
const buildScript = packageJson.scripts?.build;

if (!buildScript) {
  fail("No build script found in package.json");
}

// Check for --webpack flag
if (!buildScript.includes("--webpack")) {
  fail(
    `Build script MUST include "--webpack" to ensure safe dependency resolution until Turbopack supports fallbacks.\n   Current script: "${buildScript}"`,
  );
}

success("Build script explicitly enforces --webpack.");
