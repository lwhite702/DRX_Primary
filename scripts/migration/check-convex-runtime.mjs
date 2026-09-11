#!/usr/bin/env node
// WRE-115: structural retirement gate, not a substitute for workflow/data proof.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "apps/app/package.json"));
const ts = require("typescript");
const ignored = new Set(["node_modules", ".next", "_generated", "tests", "__tests__", "e2e", "prisma", ".expo", "dist", "build"]);
const roots = ["apps/app/app", "apps/app/components", "apps/app/lib", "apps/app/jobs", "apps/app/convex", "apps/mobile/src", "apps/mobile/app", "apps/marketing/app", "apps/marketing/lib", "apps/app/proxy.ts", "apps/app/middleware.ts"];
const legacy = /^(?:@\/lib\/(?:db(?:\/|$)|supabase(?:\/|$)|data-access(?:\/|$)|data\/client\/supabase-client)|@wrelik\/db(?:\/|$)|@prisma\/client(?:\/|$)|@prisma\/adapter-|@supabase\/(?:supabase-js|ssr)|@neondatabase\/serverless$|pg$|postgres$)/;
function files(directory) {
  if (!fs.existsSync(directory)) return [];
  if (fs.statSync(directory).isFile()) return [directory];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : /\.[cm]?[jt]sx?$/.test(entry.name) && !/\.(?:test|spec|d)\.[cm]?[jt]sx?$/.test(entry.name) ? [full] : [];
  });
}
const findings = [];
for (const file of roots.flatMap(relative => files(path.join(root, relative)))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function inspect(node) {
    let specifier;
    let typeOnly = false;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
      typeOnly = node.isTypeOnly || node.importClause?.isTypeOnly || false;
      if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) && !node.importClause.name) {
        const elements = node.importClause.namedBindings.elements;
        typeOnly ||= elements.length > 0 && elements.every(element => element.isTypeOnly);
      }
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      specifier = node.arguments[0];
    }
    if (specifier && ts.isStringLiteral(specifier)) {
      const target = specifier.text;
      // Relative references to the db wrapper are just as significant as aliases.
      const normalized = target.startsWith(".") ? path.relative(path.join(root, "apps/app"), path.resolve(path.dirname(file), target)).replaceAll(path.sep, "/") : target;
      if (legacy.test(target) || /^lib\/(?:db(?:\.[cm]?[jt]s|\/.*)?|supabase\/.*|data-access(?:\.[cm]?[jt]s|\/.*)?)$/.test(normalized)) {
        findings.push({ file: path.relative(root, file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, dependency: target, typeOnly });
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
}
const runtime = findings.filter(row => !row.typeOnly);
const summary = { runtimeImports: runtime.length, runtimeFiles: new Set(runtime.map(row => row.file)).size, typeOnlyImports: findings.length - runtime.length };
if (process.argv.includes("--json")) console.log(JSON.stringify({ summary, findings }, null, 2));
else {
  console.log(`Convex retirement gate: ${summary.runtimeImports} legacy runtime imports in ${summary.runtimeFiles} files; ${summary.typeOnlyImports} type-only imports.`);
  for (const row of findings) console.log(`${row.file}:${row.line} ${row.typeOnly ? "type" : "runtime"} ${row.dependency}`);
}
// --report permits auditing an in-progress migration without claiming the gate passed.
if (runtime.length && !process.argv.includes("--report")) process.exitCode = 1;
