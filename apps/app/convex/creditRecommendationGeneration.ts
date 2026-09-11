import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { inputsValidator, readCreditRecommendationInputs } from "./creditRecommendationInputs";

const scope = { businessId: v.string(), expectedUserId: v.string(), customerId: v.string() };
const settingsValidator = v.object({ revision: v.number(), maxCustomerCents: v.number(), inventoryCapBps: v.number(), newCustomerCents: v.number() });
const DAY = 86400000, PROVIDER_TIMEOUT_MS = 20000, MAX_BODY_BYTES = 65536;
const unavailable = () => new Error("UNAVAILABLE: Credit recommendation generation is temporarily unavailable");
function integer(value: number, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error("INVALID_STATE: Invalid recommendation settings");
}
/** Financial/customer authority suffices; generation does not grant settings administration. */
export const snapshot = internalQuery({
  args: scope, returns: v.object({ inputs: inputsValidator, settings: settingsValidator }),
  handler: async (ctx, args) => {
    const inputs = await readCreditRecommendationInputs(ctx, { ...args, asOfDate: Math.floor(Date.now() / DAY) * DAY });
    if (inputs.coverage !== "canonical") throw new Error("INSUFFICIENT_HISTORY: Recommendation requires reconciled canonical history");
    const settings = await ctx.db.query("creditRecommendationSettings").withIndex("by_businessId", q => q.eq("businessId", inputs.businessId)).unique();
    if (!settings || !settings.enabled) throw new Error("UNAVAILABLE: Credit recommendation settings are unavailable");
    integer(settings.revision, 1); integer(settings.maxCustomerCents); integer(settings.inventoryCapBps); integer(settings.newCustomerCents); integer(settings.autoRefreshDays, 1); integer(settings.autoRefreshDays * DAY);
    if (settings.inventoryCapBps > 10000) throw new Error("INVALID_STATE: Invalid recommendation settings");
    return { inputs, settings: { revision: settings.revision, maxCustomerCents: settings.maxCustomerCents, inventoryCapBps: settings.inventoryCapBps, newCustomerCents: settings.newCustomerCents } };
  },
});

/** Operational limiter state, deliberately mutable; never a financial idempotency receipt.
 * Preserve the existing shared-business allowance of ten provider attempts per hour.
 */
export const reserveProviderAttempt = internalMutation({
  args: { businessId: v.string(), expectedUserId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS"); requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const key = "__credit_recommendation_provider_rate_v1", action = "credit_recommendation_provider_rate";
    const now = Date.now(); integer(now);
    const saved = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    let timestamps: number[] = [];
    if (saved) {
      if (saved.action !== action || saved.resultJson.length > 1024) throw new Error("INVALID_STATE: Recommendation rate state requires reconciliation");
      let parsed: { attemptedAt?: unknown };
      try { parsed = JSON.parse(saved.resultJson); } catch { throw new Error("INVALID_STATE: Recommendation rate state requires reconciliation"); }
      if (!parsed || !Array.isArray(parsed.attemptedAt) || parsed.attemptedAt.length > 10 || parsed.attemptedAt.some((value, index, all) => !Number.isSafeInteger(value) || value < 0 || value > now || (index > 0 && value < all[index - 1]))) throw new Error("INVALID_STATE: Recommendation rate state requires reconciliation");
      timestamps = parsed.attemptedAt as number[];
    }
    timestamps = timestamps.filter(at => at > now - 3600000);
    if (timestamps.length >= 10) throw new Error("RATE_LIMITED: Credit recommendation provider limit reached. Try again later");
    timestamps.push(now);
    if (saved) await ctx.db.patch(saved._id, { resultJson: JSON.stringify({ attemptedAt: timestamps }) });
    else await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action, resultJson: JSON.stringify({ attemptedAt: timestamps }), createdAt: now });
    return null;
  },
});

type Snapshot = FunctionReturnType<typeof internal.creditRecommendationGeneration.snapshot>;
type Saved = FunctionReturnType<typeof internal.creditRecommendations.recordGenerated>;
type Output = { recommendedLimitCents: number; rangeMinCents: number; rangeMaxCents: number; riskScore: number; justification: string };
function parseOutput(body: string, cap: number): Output {
  const envelope = JSON.parse(body);
  const choice = envelope?.choices?.[0];
  if (!choice || choice.finish_reason !== "stop" || typeof choice.message?.content !== "string" || choice.message.content.length > 8192) throw unavailable();
  const value = JSON.parse(choice.message.content);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw unavailable();
  for (const field of ["recommendedLimitCents", "rangeMinCents", "rangeMaxCents"] as const) if (!Number.isSafeInteger(value[field]) || value[field] < 0 || value[field] > cap) throw unavailable();
  if (value.rangeMinCents > value.recommendedLimitCents || value.recommendedLimitCents > value.rangeMaxCents || typeof value.riskScore !== "number" || !Number.isFinite(value.riskScore) || value.riskScore < 0 || value.riskScore > 100 || typeof value.justification !== "string" || !value.justification.trim() || value.justification.length > 2000) throw unavailable();
  return { recommendedLimitCents: value.recommendedLimitCents, rangeMinCents: value.rangeMinCents, rangeMaxCents: value.rangeMaxCents, riskScore: value.riskScore, justification: value.justification };
}
async function provider(snapshot: Snapshot, key: string): Promise<Output> {
  const { inputs, settings } = snapshot;
  const capCents = Math.min(settings.maxCustomerCents, Math.floor(inputs.inventory.catalogCostCents * (settings.inventoryCapBps / 10000)));
  integer(capCents);
  // Deliberate whitelist: no canonical IDs, keys, actors, names, contact fields, or raw history.
  const ageDays = (at: number | null) => at === null ? null : Math.floor((inputs.observedAt - at) / DAY);
  const sales = { salesCents: inputs.sales.salesCents, sales30dCents: inputs.sales.sales30dCents, sales90dCents: inputs.sales.sales90dCents, completedSaleCount: inputs.sales.completedSaleCount, firstSaleAgeDays: ageDays(inputs.sales.firstSaleAt), latestSaleAgeDays: ageDays(inputs.sales.latestSaleAt) };
  const prompt = JSON.stringify({ credit: inputs.credit, sales, inventory: inputs.inventory, policy: { creditEnabled: inputs.policy.creditEnabled, limitCents: inputs.policy.limitCents, balanceCents: inputs.policy.balanceCents }, repaymentTiming: inputs.repaymentTiming, maxLimitCents: capCents, newCustomerCents: settings.newCustomerCents });
  if (new TextEncoder().encode(prompt).byteLength > 16384) throw unavailable();
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); if (reader) void reader.cancel().catch(() => {}); reject(unavailable()); }, PROVIDER_TIMEOUT_MS); });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL?.trim() || "gpt-5.5", response_format: { type: "json_object" }, temperature: 0, max_tokens: 800, messages: [
          { role: "system", content: "Recommend a customer credit limit using only the supplied aggregate financial facts. All money is integer cents. Return JSON with recommendedLimitCents, rangeMinCents, rangeMaxCents, riskScore (0 to 100), and a concise justification. The range must contain the recommendation; all amounts must be between zero and maxLimitCents. Repayment timing is not evaluated: never describe it as on-time, perfect, or proven reliability. Sales aggregates describe completed sales only. Credit issueCount counts explicit credit extensions; creditSaleCount counts credit-funded sales. Sale ages describe elapsed days since the first and latest completed sale, not customer tenure. Inventory is current catalog cost, not FIFO cost or measured turnover. Do not infer inventory turnover or repayment punctuality from these aggregates. Zero proposes freezing credit while retaining its previous limit; a positive amount does not enable disabled credit. Do not include identities, contact details, or invented facts." },
          { role: "user", content: prompt },
        ] }),
      });
      if (!response.ok || !response.body) throw unavailable();
      const declaredSize = response.headers.get("content-length");
      if (declaredSize !== null && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > MAX_BODY_BYTES)) throw unavailable();
      reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let size = 0, body = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BODY_BYTES) throw unavailable();
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
      return parseOutput(body, capCents);
    })()]);
  } catch { throw unavailable(); }
  finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); if (reader) void reader.cancel().catch(() => {}); }
}

export const generate = action({
  args: { ...scope, requestKey: v.string() },
  handler: async (ctx, args): Promise<Saved> => {
    // A completed request survives current settings, day, archive and provider availability changes.
    const prior: Saved | null = await ctx.runQuery(internal.creditRecommendations.requestResult, args);
    if (prior) return prior;
    const current: Snapshot = await ctx.runQuery(internal.creditRecommendationGeneration.snapshot, { businessId: args.businessId, expectedUserId: args.expectedUserId, customerId: args.customerId });
    const key = process.env.OPENAI_API_KEY?.trim();
    // Rules fallback awaits an explicit canonical-history scoring design.
    if (!key) throw unavailable();
    await ctx.runMutation(internal.creditRecommendationGeneration.reserveProviderAttempt, { businessId: args.businessId, expectedUserId: args.expectedUserId });
    const output = await provider(current, key);
    return ctx.runMutation(internal.creditRecommendations.recordGenerated, { ...args, inputs: current.inputs, settingsRevision: current.settings.revision, ...output, provenance: "provider", engineVersion: "canonical_provider_v1" });
  },
});
