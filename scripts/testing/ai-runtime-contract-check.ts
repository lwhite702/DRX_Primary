import fs from "fs";
import path from "path";

const root = process.cwd();

const mirroredFunctionFiles = [
  "apps/app/edge/ai_insights/index.ts",
  "apps/app/edge/cashflow/index.ts",
  "apps/app/edge/credit_risk/index.ts",
  "apps/app/edge/inventory_health/index.ts",
  "apps/app/supabase/functions/ai_insights/index.ts",
  "apps/app/supabase/functions/cashflow/index.ts",
  "apps/app/supabase/functions/credit_risk/index.ts",
  "apps/app/supabase/functions/inventory_health/index.ts",
];

const additionalFunctionFiles = [
  "apps/app/edge/ai_pricing_inventory/index.ts",
];

const aiModelFiles = [
  ...mirroredFunctionFiles,
  "apps/app/lib/credit/aiEngine/limitEngine.ts",
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function read(filePath: string): string {
  const absolutePath = path.join(root, filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing file: ${filePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function assertIncludes(filePath: string, text: string, expected: string) {
  if (!text.includes(expected)) {
    fail(`${filePath} is missing required pattern: ${expected}`);
  }
}

function assertExcludes(filePath: string, text: string, forbidden: RegExp, label: string) {
  if (forbidden.test(text)) {
    fail(`${filePath} still contains forbidden ${label}`);
  }
}

for (const filePath of [...mirroredFunctionFiles, ...additionalFunctionFiles]) {
  const text = read(filePath);

  assertIncludes(filePath, text, "getMissingRequiredEnv");
  assertIncludes(filePath, text, "SUPABASE_URL");
  assertIncludes(filePath, text, "SUPABASE_SERVICE_ROLE_KEY");
  assertExcludes(filePath, text, /Deno\.env\.get\("SUPABASE_URL"\)!/, "non-null env assertion");
  assertExcludes(
    filePath,
    text,
    /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)!/,
    "non-null env assertion",
  );

  const reqJsonReads = (text.match(/await req\.json\(\)/g) ?? []).length;
  if (reqJsonReads > 1) {
    fail(`${filePath} reads request body multiple times (${reqJsonReads}). Expected 1.`);
  }

  assertExcludes(filePath, text, /await req\.json\(\)\)\.business_id/, "req.json() usage in error logging");
}

for (const filePath of aiModelFiles) {
  const text = read(filePath);
  assertExcludes(filePath, text, /gpt-5\.1/, "legacy model literal gpt-5.1");
  assertIncludes(filePath, text, "OPENAI_MODEL");
}

console.log("AI runtime contract check passed.");

