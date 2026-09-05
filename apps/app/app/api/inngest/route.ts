import { serve } from "@/lib/adapters/jobs";
import { inngest } from "@/lib/queue";
import { aiPricingInventoryFunction } from "@/jobs/ai-pricing-inventory";

// Inngest serve handler for Next.js App Router
export const { GET, POST, PUT } = serve({
  client: inngest as any,
  functions: [
    aiPricingInventoryFunction as any,
  ],
});
