import { decodeCustomerPii } from "@/lib/privacy/customer-pii";
import { mapCustomerToOperationalModel } from "@/lib/customers/core/customer-normalizer";
import type { PrivacyProtocolSettings } from "@/lib/privacy/types";

export type CustomerRealtimeEvent = {
  event: "INSERT" | "UPDATE" | "DELETE";
  row: Record<string, unknown>;
};

export async function transformRealtimeCustomerEvent(args: {
  event: CustomerRealtimeEvent;
  privacyPolicy: PrivacyProtocolSettings;
}) {
  if (args.event.event === "DELETE") {
    return {
      event: "DELETE" as const,
      customerId: String(args.event.row.id || ""),
    };
  }

  const pii = await decodeCustomerPii(args.event.row);
  const model = mapCustomerToOperationalModel(args.event.row, pii);

  return {
    event: args.event.event,
    customer: model,
    policy_profile: args.privacyPolicy.profile,
  };
}
