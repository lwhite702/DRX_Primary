import { z } from "zod";
import { privacyProtocolSchema } from "./protocol-schema";

export async function fetchPrivacyContext(businessId: string, signal?: AbortSignal) {
  const options = { headers: { "X-Business-Id": businessId }, cache: "no-store" as const, signal };
  const [policy, preference] = await Promise.all([fetch("/api/privacy/policy", options), fetch("/api/privacy/protexion/preferences", options)]);
  if (!policy.ok || !preference.ok) throw new Error("Privacy settings are unavailable");
  const { protocol } = z.object({ protocol: privacyProtocolSchema }).parse(await policy.json());
  const { manual_enabled } = z.object({ manual_enabled: z.boolean() }).parse(await preference.json());
  return { protocol, manualEnabled: manual_enabled };
}
