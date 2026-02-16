import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

type Finding = { file: string; message: string };

const stalePatterns = [
  /\.orig$/i,
  /\.rej$/i,
  /build_error.*\.log$/i,
  /^apps\/app\/playwright-report\//,
  /^apps\/app\/test-results\//,
  /^testsprite_tests\//,
  /^apps\/app\/testsprite_tests\//,
];

const testFilePattern = /\.(test|spec)\.(ts|tsx|js)$/;
const productionPathPattern = /^(apps\/(app|marketing|mobile)\/(app|components|lib|src)|packages\/[^/]+\/src)\//;

function trackedFiles(): string[] {
  const out = execSync("git ls-files", { cwd: root, encoding: "utf8" });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(root, file)));
}

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function findDisallowedTestControls(files: string[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    if (!testFilePattern.test(file)) continue;
    const text = read(file);
    const checks = [".skip(", ".only(", "test.todo(", "it.todo(", "describe.todo("];
    for (const check of checks) {
      if (text.includes(check)) {
        findings.push({ file, message: `Disallowed test control detected: ${check}` });
      }
    }
  }
  return findings;
}

function findTodoComments(files: string[]): Finding[] {
  const findings: Finding[] = [];
  const regex = /(^|\s)\/\/\s*(TODO|FIXME|XXX)\b|\/\*+[\s\S]*?(TODO|FIXME|XXX)\b[\s\S]*?\*\//gm;
  for (const file of files) {
    if (!productionPathPattern.test(file)) continue;
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
    const text = read(file);
    if (regex.test(text)) {
      findings.push({ file, message: "TODO/FIXME/XXX comment in production code path" });
    }
  }
  return findings;
}

function findRuntimeMockCompatibility(files: string[]): Finding[] {
  const findings: Finding[] = [];
  const mockFile = "apps/app/lib/supabase/client.ts";
  if (files.includes(mockFile)) {
    findings.push({ file: mockFile, message: "Runtime mock compatibility client exists" });
  }

  for (const file of files) {
    if (!productionPathPattern.test(file)) continue;
    if (file.includes("/tests/") || testFilePattern.test(file)) continue;
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = read(file);
    if (/(getSupabaseClient\(|from\s+["']@\/lib\/supabase\/client["'])/.test(text)) {
      findings.push({ file, message: "Production path depends on Supabase compatibility client" });
    }
    if (/mockSupabase/i.test(text)) {
      findings.push({ file, message: "Mock Supabase symbol detected in production path" });
    }
  }
  return findings;
}

function findStaleArtifacts(files: string[]): Finding[] {
  return files
    .filter((file) => stalePatterns.some((p) => p.test(file)))
    .map((file) => ({ file, message: "Tracked stale/deprecated artifact" }));
}

function main() {
  const files = trackedFiles();
  const findings = [
    ...findStaleArtifacts(files),
    ...findDisallowedTestControls(files),
    ...findTodoComments(files),
    ...findRuntimeMockCompatibility(files),
  ];

  if (findings.length > 0) {
    console.error("Policy check failed with findings:");
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.message}`);
    }
    process.exit(1);
  }

  console.log("Policy check passed.");
}

main();
