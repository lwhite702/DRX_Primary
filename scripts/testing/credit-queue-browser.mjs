import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = process.argv[2];
if (!output) throw new Error("Pass a scratch output directory for this synthetic browser test.");
await mkdir(output, { recursive: true });
const bundle = resolve(output, "credit-queue.mjs");
await build({ entryPoints: [resolve(root, "apps/app/lib/credit/pending-queue.ts")], bundle: true, platform: "browser", format: "esm", outfile: bundle });
const source = await readFile(bundle);
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/credit-queue.mjs") { res.setHeader("Content-Type", "text/javascript"); res.end(source); }
  else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><title>Synthetic credit queue test</title><script type="module">window.queueModule = await import("/credit-queue.mjs");</script>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  const launchOptions = { headless: true, ...(existsSync(chromium.executablePath()) ? {} : { channel: "chrome" }) };
  const profile = resolve(output, "browser-profile");
  browser = await chromium.launchPersistentContext(profile, launchOptions);
  let page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.queueModule);
  const fixture = await page.evaluate(async () => {
    const { CreditPendingQueue } = window.queueModule;
    const scope = { deployment: "http://127.0.0.1:3210", operatorId: "synthetic-" + crypto.randomUUID(), businessId: "synthetic-business" };
    const queue = new CreditPendingQueue();
    await Promise.all(Array.from({ length: 12 }, (_, i) => queue.create(scope, { customerId: "synthetic-customer", kind: "issue", amountCents: i + 1, description: "Synthetic browser private note" })));
    const rows = await queue.pending(scope);
    if (rows.entries.length !== 12 || new Set(rows.entries.map(row => row.requestKey)).size !== 12) throw new Error("Concurrent durable requests were lost");
    return { scope, ids: rows.entries.map(row => row.requestKey) };
  });
  await page.reload();
  await page.waitForFunction(() => window.queueModule);
  await browser.close();
  browser = await chromium.launchPersistentContext(profile, launchOptions);
  page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.queueModule);
  await page.evaluate(async ({ scope, ids }) => {
    const { CreditPendingQueue, syncCreditRequests } = window.queueModule;
    const queue = new CreditPendingQueue();
    const rows = await queue.pending(scope);
    if (JSON.stringify(rows.entries.map(row => row.requestKey)) !== JSON.stringify(ids)) throw new Error("Reload lost request identity or durable order");
    if ((await queue.pending({ ...scope, operatorId: "other-operator" })).entries.length !== 0) throw new Error("Foreign queue was exposed");
    let denied = false;
    try { await queue.confirm({ ...scope, operatorId: "other-operator" }, ids[0]); } catch { denied = true; }
    if (!denied || (await queue.pending(scope)).entries.length !== 12) throw new Error("Foreign removal was permitted");
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(...args) {
      const request = original.apply(this, args);
      if (this.name === "requests") { const tx = this.transaction; queueMicrotask(() => tx.abort()); }
      return request;
    };
    let rejected = false;
    try { await queue.create(scope, { customerId: "synthetic", kind: "payment", amountCents: 100 }); } catch { rejected = true; }
    finally { IDBObjectStore.prototype.add = original; }
    if (!rejected || (await queue.pending(scope)).entries.length !== 12) throw new Error("An aborted transaction was acknowledged");
    const calls = [];
    const response = await syncCreditRequests(queue, scope, () => true, async (_url, options) => {
      calls.push(options.headers["Idempotency-Key"]);
      return new Response(JSON.stringify({ id: "synthetic-ledger-id" }), { status: 201, headers: { "Idempotency-Key": options.headers["Idempotency-Key"] } });
    });
    if (response.confirmed !== 12 || JSON.stringify(calls) !== JSON.stringify(ids) || (await queue.pending(scope)).entries.length !== 0) throw new Error("Confirmed queue did not drain in order");
  }, fixture);
  console.log("PASS: real browser IndexedDB encryption/key persistence, 12 concurrent writes, reload/browser-restart/order, foreign access/removal denial, aborted-transaction rejection and confirmed queue draining. Synthetic fixtures and transport only.");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
