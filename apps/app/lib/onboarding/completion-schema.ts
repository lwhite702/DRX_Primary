import { z } from "zod";
export const onboardingCompletionSchema = z.object({
  businessName: z.string().trim().min(1).max(255),
  ownerName: z.string().trim().min(1).max(200),
  businessType: z.string().trim().min(1).max(100),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().min(1).max(100),
  taxEnabled: z.boolean(), taxRateBps: z.number().int().min(0).max(10000),
  inventoryEnabled: z.boolean(),
  locationName: z.string().trim().max(500),
  city: z.string().trim().max(100), region: z.string().trim().max(100), country: z.string().trim().max(100),
  dashboardPreset: z.enum(["operations", "checkout", "inventory"]),
}).strict().superRefine((value, ctx) => {
  if (!value.taxEnabled && value.taxRateBps !== 0) ctx.addIssue({ code: "custom", message: "Disabled tax must have a zero rate" });
  try { new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }); }
  catch { ctx.addIssue({ code: "custom", path: ["timezone"], message: "Invalid timezone" }); }
});
