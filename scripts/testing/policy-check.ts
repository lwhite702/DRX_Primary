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
const gatedTestPathPattern = /^apps\/(app|marketing|mobile)\/tests\/(?!non_gated\/)/;
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
  const checks = [".skip(", ".only(", "test.todo(", "it.todo(", "describe.todo("];

  for (const file of files) {
    if (!testFilePattern.test(file)) continue;
    if (!gatedTestPathPattern.test(file)) continue;
    const text = read(file);
    for (const check of checks) {
      if (text.includes(check)) {
        findings.push({ file, message: `Disallowed test control detected in gated suite: ${check}` });
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
  const legacyMockFile = "apps/app/lib/supabase/client.ts";

  if (files.includes(legacyMockFile)) {
    findings.push({ file: legacyMockFile, message: "Legacy runtime mock compatibility file exists" });
  }

  for (const file of files) {
    if (!productionPathPattern.test(file)) continue;
    if (file.includes("/tests/") || testFilePattern.test(file)) continue;
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = read(file);

    if (/@\/lib\/supabase\/client/.test(text)) {
      findings.push({ file, message: "Production path imports legacy Supabase compatibility client" });
    }

    if (/getSupabaseClient\(/.test(text)) {
      findings.push({ file, message: "Production path uses legacy getSupabaseClient()" });
    }

    if (/mockSupabase/i.test(text)) {
      findings.push({ file, message: "Production path references mockSupabase symbol" });
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
