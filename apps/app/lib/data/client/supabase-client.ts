import { getSupabaseClient } from "@/lib/supabase/client";

// Compatibility shim for historical imports.
export function createAppClient() {
  return getSupabaseClient();
}

export const supabase = getSupabaseClient();
