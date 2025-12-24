import { createClient } from "@supabase/supabase-js";

// Note: SUPABASE_SERVICE_ROLE_KEY should only be used in server contexts (API routes, Server Actions)
// Never expose this in client-side code.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
