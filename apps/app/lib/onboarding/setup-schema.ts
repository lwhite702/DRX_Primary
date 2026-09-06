import { z } from "zod";

const label = z.string().trim().min(1).max(120);
const unit = z.string().trim().min(1).max(32);
const quantity = z.number().finite().positive().max(Number.MAX_SAFE_INTEGER);
export const setupBusinessSchema = z.object({
  businessName: z.string().trim().min(1).max(255),
  businessType: z.string().trim().min(1).max(100),
  address: z.string().trim().max(500),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  zipCode: z.string().trim().max(32),
  ownerPhone: z.string().trim().max(50),
  ownerName: z.string().trim().min(1).max(200),
  defaultUnit: unit,
  quickQuantities: z.array(z.object({ label, value: quantity, unit, enabled: z.boolean() }).strict()).max(100),
  privacyPreset: z.enum(["alias_mode", "standard_mode", "business_crm_mode"]),
  inventoryReasons: z.array(z.object({ label, type: label, enabled: z.boolean() }).strict()).max(100),
  nicknames: z.array(z.object({ slang: label, quantity, unit, enabled: z.boolean() }).strict()).max(100),
}).strict();
export type SetupBusinessInput = z.infer<typeof setupBusinessSchema>;
