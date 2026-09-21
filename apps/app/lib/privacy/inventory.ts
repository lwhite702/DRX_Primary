import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export interface PrivacyInventoryCounts { alias_count: number; phone_count: number; email_count: number; address_count: number; notes_count: number; }
export interface PrivacyInventorySnapshot extends PrivacyInventoryCounts { id: string; business_id: string; captured_at: string; alias_delta: number; phone_delta: number; email_delta: number; address_delta: number; notes_delta: number; }

export async function computePrivacyInventoryCounts(businessId: string): Promise<PrivacyInventoryCounts> {
  const { client, expectedUserId } = await businessClient(businessId);
  return client.query(api.privacyInventory.getCurrent, { businessId, expectedUserId });
}

export async function getLatestPrivacyInventorySnapshot(businessId: string): Promise<PrivacyInventorySnapshot | null> {
  const { client, expectedUserId } = await businessClient(businessId);
  return client.query(api.privacyInventory.getLatest, { businessId, expectedUserId });
}

export async function capturePrivacyInventorySnapshot(businessId: string): Promise<PrivacyInventorySnapshot> {
  const { client, expectedUserId } = await businessClient(businessId);
  return client.mutation(api.privacyInventory.capture, { businessId, expectedUserId });
}
