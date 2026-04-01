#!/usr/bin/env node
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, "testsprite_tests", "testsprite_frontend_test_plan.json");
const outDir = path.join(repoRoot, "testsprite_tests", "local");
const groupedPath = path.join(outDir, "testsprite_frontend_test_plan.grouped.json");
const checklistPath = path.join(outDir, "testsprite_frontend_test_plan.local.md");
const specPath = path.join(repoRoot, "apps", "app", "tests", "e2e", "testsprite-generated.spec.ts");

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source test plan: ${sourcePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(sourcePath, "utf8");
const cases = JSON.parse(raw);

if (!Array.isArray(cases)) {
  console.error("Unexpected plan format: expected top-level array.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const grouped = {};
for (const tc of cases) {
  const category = tc.category || "Uncategorized";
  if (!grouped[category]) grouped[category] = [];
  grouped[category].push(tc);
}

const groupedOutput = {
  generatedAt: new Date().toISOString(),
  source: "testsprite_tests/testsprite_frontend_test_plan.json",
  totalCases: cases.length,
  categories: Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, items]) => ({
      category,
      caseCount: items.length,
      cases: items,
    })),
};

fs.writeFileSync(groupedPath, `${JSON.stringify(groupedOutput, null, 2)}\n`);

const lines = [];
lines.push("# Testsprite Plan Converted for Local Use");
lines.push("");
lines.push(`- Source: \`${path.relative(repoRoot, sourcePath)}\``);
lines.push(`- Generated: ${groupedOutput.generatedAt}`);
lines.push(`- Total cases: ${cases.length}`);
lines.push("");
lines.push("## Local Execution Notes");
lines.push("");
lines.push("- These cases were generated from Testsprite and converted into a local checklist and Playwright skeleton suite.");
lines.push("- The Playwright suite is intentionally marked with `test.skip` for each case.");
lines.push("- Remove `skip` and replace step comments with concrete selectors/assertions as you implement each case.");
lines.push("");

for (const category of Object.keys(grouped).sort((a, b) => a.localeCompare(b))) {
  const items = grouped[category];
  lines.push(`## ${category} (${items.length})`);
  lines.push("");

  for (const tc of items) {
    lines.push(`### ${tc.id}: ${tc.title}`);
    lines.push(`- Priority: ${tc.priority || "Unspecified"}`);
    lines.push(`- Description: ${tc.description || ""}`);
    lines.push("- Steps:");

    const steps = Array.isArray(tc.steps) ? tc.steps : [];
    for (const step of steps) {
      lines.push(`  - [ ] (${step.type || "step"}) ${step.description || ""}`);
    }

    lines.push("");
  }
}

fs.writeFileSync(checklistPath, `${lines.join("\n")}\n`);

const esc = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/\n/g, " ");

const spec = [];
spec.push('import { test } from "@playwright/test";');
spec.push("");
spec.push("/**");
spec.push(" * Auto-generated from testsprite_tests/testsprite_frontend_test_plan.json.");
spec.push(" * Each case is skipped by default; convert steps into concrete selectors/assertions.");
spec.push(" */");
spec.push("");
spec.push("const testspriteCases = [");
for (const tc of cases) {
  const routeStep = Array.isArray(tc.steps) ? tc.steps.find((s) => typeof s?.description === "string" && s.description.toLowerCase().startsWith("navigate to ")) : undefined;
  const inferredRoute = routeStep ? routeStep.description.replace(/^Navigate to\s+/i, "").trim() : "/";

  spec.push("  {");
  spec.push(`    id: \`${esc(tc.id)}\`,`);
  spec.push(`    title: \`${esc(tc.title)}\`,`);
  spec.push(`    category: \`${esc(tc.category)}\`,`);
  spec.push(`    priority: \`${esc(tc.priority)}\`,`);
  spec.push(`    description: \`${esc(tc.description)}\`,`);
  spec.push(`    inferredRoute: \`${esc(inferredRoute || "/")}\`,`);
  spec.push("    steps: [");
  for (const step of (Array.isArray(tc.steps) ? tc.steps : [])) {
    spec.push("      {");
    spec.push(`        type: \`${esc(step.type)}\`,`);
    spec.push(`        description: \`${esc(step.description)}\`,`);
    spec.push("      },");
  }
  spec.push("    ],");
  spec.push("  },");
}

spec.push("]; ");
spec.push("");
spec.push("for (const tc of testspriteCases) {");
spec.push("  test.describe(tc.category, () => {");
spec.push("    test.skip(`${tc.id} ${tc.title}`, async ({ page }) => {");
spec.push("      // Route inference is best-effort from a 'Navigate to ...' step.");
spec.push("      await page.goto(tc.inferredRoute || '/');");
spec.push("");
spec.push("      // Replace with real actions/assertions as you localize each case.");
spec.push("      for (const step of tc.steps) {");
spec.push("        await test.step(`[${step.type}] ${step.description}`, async () => {");
spec.push("          // TODO: implement using page.getByRole/getByLabel and expect(...).toBeVisible() etc.");
spec.push("        });");
spec.push("      }");
spec.push("    });");
spec.push("  });");
spec.push("}");

fs.writeFileSync(specPath, `${spec.join("\n")}\n`);

console.log("Converted Testsprite plan to local artifacts:");
console.log(`- ${path.relative(repoRoot, groupedPath)}`);
console.log(`- ${path.relative(repoRoot, checklistPath)}`);
console.log(`- ${path.relative(repoRoot, specPath)}`);
