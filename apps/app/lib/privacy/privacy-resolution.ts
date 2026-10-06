import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import type { PrivacyProtocolSettings } from "@/lib/privacy/types";
import { getBaselinePrivacyPolicy } from "./privacy-policy";

export async function resolveBusinessPrivacyPolicy(businessId: string): Promise<PrivacyProtocolSettings> {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return getBaselinePrivacyPolicy();
  }
  const { client, ...context } = await businessClient(businessId);
  return client.query(api.businessPreferences.getPrivacyPolicy, context);
}
export async function updateBusinessPrivacyPolicy(args: { businessId: string; userId: string | null; nextPolicy: PrivacyProtocolSettings }) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return {
      businessId: args.businessId,
      collectTax: true,
      defaultTaxRate: 0.0825,
      posManagerPin: null,
      settingsData: { privacy_protocol: args.nextPolicy },
    };
  }
  const { client, ...context } = await businessClient(args.businessId);
  if (args.userId !== context.expectedUserId) throw new Error("FORBIDDEN: Operator context changed");
  const result = await client.mutation(api.businessPreferences.saveSettings, { ...context, privacyProtocol: args.nextPolicy });
  return { businessId: context.businessId, collectTax: result.collectTax, defaultTaxRate: result.taxRateBps / 10000,
    posManagerPin: null, settingsData: { privacy_protocol: result.privacyProtocol } };
}
export async function getManualScreenPrivacyPreference(args: { businessId: string; userId: string }): Promise<{ manual_enabled: boolean } | null> {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return { manual_enabled: false };
  }
  const { client, ...context } = await businessClient(args.businessId);
  if (args.userId !== context.expectedUserId) throw new Error("FORBIDDEN: Operator context changed");
  return client.query(api.businessPreferences.getManualPreference, context);
}
export async function setManualScreenPrivacyPreference(args: { businessId: string; userId: string; manualEnabled: boolean }) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return args.manualEnabled;
  }
  const { client, ...context } = await businessClient(args.businessId);
  if (args.userId !== context.expectedUserId) throw new Error("FORBIDDEN: Operator context changed");
  const result = await client.mutation(api.businessPreferences.setManualPreference, { ...context, manualEnabled: args.manualEnabled });
  return result.manual_enabled === args.manualEnabled;
}
