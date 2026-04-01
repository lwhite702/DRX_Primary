import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportPath = path.join(root, "docs/testing/PERF_SMOKE.json");

function directorySize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) total += directorySize(absolute);
    else total += fs.statSync(absolute).size;
  }
  return total;
}

const appNext = path.join(root, "apps/app/.next");
const marketingNext = path.join(root, "apps/marketing/.next");

const appSizeMb = directorySize(appNext) / (1024 * 1024);
const marketingSizeMb = directorySize(marketingNext) / (1024 * 1024);

const thresholds = {
  appNextMb: 300,
  marketingNextMb: 120,
};

const result = {
  generatedAt: new Date().toISOString(),
  metrics: {
    appNextMb: Number(appSizeMb.toFixed(2)),
    marketingNextMb: Number(marketingSizeMb.toFixed(2)),
  },
  thresholds,
  pass:
    appSizeMb <= thresholds.appNextMb &&
    marketingSizeMb <= thresholds.marketingNextMb,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

if (!result.pass) {
  console.error("Performance smoke check failed", result);
  process.exit(1);
}

console.log("Performance smoke check passed", result.metrics);
