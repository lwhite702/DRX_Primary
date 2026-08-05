import { createClient } from "@supabase/supabase-js";

type SupabaseCompatClient = any;

let client: SupabaseCompatClient | null = null;

export function createAppClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase browser client is not configured");
  }

  client = createClient<any, string, any>(url, anonKey);
  return client;
}
