import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The legacy Supabase schema was never generated; keep its payloads untyped
// while callers are migrated behind authenticated DRX APIs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseCompatClient = SupabaseClient<any, string, any>;

let client: SupabaseCompatClient | null = null;

export function createAppClient(): SupabaseCompatClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = createClient<any, string, any>(url, anonKey);
  return client;
}
