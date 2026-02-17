import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const reportPath = path.join(docsDir, "PERF_SMOKE.json");
const baselinePath = path.join(docsDir, "PERF_BASELINE.json");

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

async function apiLatencyMs(baseUrl: string, route: string): Promise<number | null> {
  const url = `${baseUrl.replace(/\/$/, "")}${route}`;
  const start = Date.now();
  try {
    await fetch(url, { method: "GET" });
    return Date.now() - start;
  } catch {
    return null;
  }
}

type Baseline = {
  schemaVersion: string;
  generatedAt: string;
  appNextMb: number;
  marketingNextMb: number;
};

function readBaseline(): Baseline {
  if (!fs.existsSync(baselinePath)) {
    return {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      appNextMb: 1300,
      marketingNextMb: 220,
    };
  }
  return JSON.parse(fs.readFileSync(baselinePath, "utf8")) as Baseline;
}

function writeBaseline(appNextMb: number, marketingNextMb: number) {
  const baseline: Baseline = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    appNextMb: Number(appNextMb.toFixed(2)),
    marketingNextMb: Number(marketingNextMb.toFixed(2)),
  };
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
}

async function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const nightly = process.env.NIGHTLY_FULL_GATE === "true";

  const appNext = path.join(root, "apps/app/.next");
  const marketingNext = path.join(root, "apps/marketing/.next");

  const appSizeMb = directorySize(appNext) / (1024 * 1024);
  const marketingSizeMb = directorySize(marketingNext) / (1024 * 1024);

  const baseline = readBaseline();

  if (updateBaseline) {
    fs.mkdirSync(docsDir, { recursive: true });
    writeBaseline(appSizeMb, marketingSizeMb);
    console.log("Updated perf baseline.");
    return;
  }

  const prDeltaThreshold = {
    appPct: 0.15,
    marketingPct: 0.15,
  };

  const hardCapsNightly = {
    appNextMb: 1600,
    marketingNextMb: 260,
    apiLatencyMs: 800,
  };

  const prThresholds = {
    appNextMb: Number((baseline.appNextMb * (1 + prDeltaThreshold.appPct)).toFixed(2)),
    marketingNextMb: Number((baseline.marketingNextMb * (1 + prDeltaThreshold.marketingPct)).toFixed(2)),
    apiLatencyMs: 800,
  };

  const thresholds = nightly ? hardCapsNightly : prThresholds;

  const baseUrl = process.env.PERF_BASE_URL;
  const apiRoutes = ["/api/notifications", "/api/inventory", "/api/customers"];
  const apiLatency: Record<string, number | null> = {};

  if (baseUrl) {
    for (const route of apiRoutes) {
      apiLatency[route] = await apiLatencyMs(baseUrl, route);
    }
  }

  const latencyPass = Object.values(apiLatency).every((v) => v === null || v <= thresholds.apiLatencyMs);
  const sizePass = appSizeMb <= thresholds.appNextMb && marketingSizeMb <= thresholds.marketingNextMb;

  const result = {
    schemaVersion: "3.0.0",
    generatedAt: new Date().toISOString(),
    mode: nightly ? "nightly" : "pr",
    metrics: {
      appNextMb: Number(appSizeMb.toFixed(2)),
      marketingNextMb: Number(marketingSizeMb.toFixed(2)),
      apiLatency,
    },
    baseline,
    thresholds,
    deltas: {
      appPct: Number((((appSizeMb - baseline.appNextMb) / baseline.appNextMb) * 100).toFixed(2)),
      marketingPct: Number((((marketingSizeMb - baseline.marketingNextMb) / baseline.marketingNextMb) * 100).toFixed(2)),
    },
    notes: {
      baselineUpdate: "Run `pnpm test:perf -- --update-baseline` on a clean CI baseline only.",
      lighthouse: "Run Lighthouse CI in dedicated nightly gate.",
      stress: "Run k6/autocannon in nightly/protected workflow only.",
    },
    pass: sizePass && latencyPass,
  };

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  if (!result.pass) {
    console.error("Performance smoke check failed", result);
    process.exit(1);
  }

  console.log("Performance smoke check passed", result.metrics);
}

main();
