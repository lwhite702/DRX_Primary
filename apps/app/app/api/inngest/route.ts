import { serve } from "inngest/next";
import { inngest } from "@wrelik/jobs";
import { aiPricingInventoryFunction } from "@/jobs/ai-pricing-inventory";

// Inngest serve handler for Next.js App Router
export const { GET, POST, PUT } = serve({
  client: inngest as any,
  functions: [
    aiPricingInventoryFunction as any,
  ],
});
