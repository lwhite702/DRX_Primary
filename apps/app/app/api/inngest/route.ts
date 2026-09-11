import { serve } from "@/lib/adapters/jobs";
import { inngest } from "@/lib/queue";

// Inngest serve handler for Next.js App Router
export const { GET, POST, PUT } = serve({
  client: inngest as any,
  functions: [],
});
