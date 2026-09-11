import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { businessClient, businessFailure } from "@/lib/business/convex-server";
import { privacyProtocolSchema } from "@/lib/privacy/protocol-schema";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

const patchSchema = z.object({
  collect_tax: z.boolean().optional(), collectTax: z.boolean().optional(),
  defaultTaxRate: z.number().min(0).max(1).optional(), default_tax_rate: z.number().min(0).max(1).optional(),
  posManagerPin: z.string().max(50).nullable().optional(), pos_manager_pin: z.string().max(50).nullable().optional(),
  privacyProtocol: privacyProtocolSchema.optional(), privacy_protocol: privacyProtocolSchema.optional(),
  privacyRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();
function response(settings: FunctionReturnType<typeof api.businessPreferences.getSettings>, privacyEnabled: boolean) {
  return NextResponse.json({
    collect_tax: settings.collectTax, collectTax: settings.collectTax,
    default_tax_rate: settings.taxRateBps / 10000, defaultTaxRate: settings.taxRateBps / 10000,
    pos_manager_pin: null, posManagerPin: null,
    posManagerPinConfigured: settings.hasPinConfigured,
    privacySettingsEnabled: privacyEnabled,
    ...(privacyEnabled ? { privacy_protocol: settings.privacyProtocol, privacyProtocol: settings.privacyProtocol, privacyRevision: settings.privacyRevision } : {}),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
async function context(request: NextRequest) {
  const connection = await businessClient(request);
  const includePrivacy = await ensureServerFlag("feat_privacy_settings_v2", {
    distinctId: connection.expectedUserId, groups: { business: connection.businessId }, defaultValue: true,
  });
  return { ...connection, includePrivacy };
}
export async function GET(request: NextRequest) {
  try {
    const { client, ...args } = await context(request);
    return response(await client.query(api.businessPreferences.getSettings, args), args.includePrivacy);
  } catch (error) { return businessFailure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const { client, ...args } = await context(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const body = parsed.data;
    for (const [camel, snake] of [["collectTax", "collect_tax"], ["defaultTaxRate", "default_tax_rate"], ["posManagerPin", "pos_manager_pin"], ["privacyProtocol", "privacy_protocol"]] as const) {
      if (body[camel] !== undefined && body[snake] !== undefined && JSON.stringify(body[camel]) !== JSON.stringify(body[snake])) throw new Error("INVALID_ARGUMENT:");
    }
    const privacyProtocol = body.privacyProtocol ?? body.privacy_protocol;
    if (!args.includePrivacy && privacyProtocol !== undefined) throw new Error("FEATURE_DISABLED:");
    const rate = body.defaultTaxRate ?? body.default_tax_rate;
    const taxRateBps = rate === undefined ? undefined : Math.round(rate * 10000);
    if (rate !== undefined && Math.abs(rate * 10000 - taxRateBps!) > 1e-6) throw new Error("INVALID_ARGUMENT:");
    const settings = await client.mutation(api.businessPreferences.saveSettings, {
      ...args, collectTax: body.collectTax ?? body.collect_tax, taxRateBps,
      posManagerPin: body.posManagerPin !== undefined ? body.posManagerPin : body.pos_manager_pin,
      privacyProtocol, expectedPrivacyRevision: body.privacyRevision,
    });
    return response(settings, args.includePrivacy);
  } catch (error) { return businessFailure(error); }
}
