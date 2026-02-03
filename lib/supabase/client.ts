/**
 * Database Client Adapter (Mock/Compatibility Layer)
 *
 * This module provides a MOCK Supabase interface to satisfy legacy code imports
 * during the migration to @wrelik/db (Prisma) and @clerk/nextjs.
 *
 * WARNING: Calls to this client will mostly return no-op or empty data.
 * Critical paths should be refactored to use `db` (Prisma) or Server Actions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase: any = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (col: string, val: any) => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null }),
      }),
      order: () => ({ data: [], error: null }),
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
    }),
    insert: (data: any) => ({
      select: () => ({ single: async () => ({ data: null, error: null }) }),
    }),
    update: (data: any) => ({
      eq: () => ({
        select: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
    delete: () => ({ eq: () => ({}) }),
    upsert: () => ({
      select: () => ({ single: async () => ({ data: null, error: null }) }),
    }),
  }),
  rpc: async (fn: string, args: any) => {
    console.warn(`Legacy Supabase RPC called: ${fn}`, args);
    return { data: null, error: null };
  },
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
  storage: {
    from: (bucket: string) => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: "" } }),
    }),
  },
  channel: (name: string) => ({
    on: (event: any, filter: any, callback: any) => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {},
  }),
  removeAllChannels: () => {},
};

export function getSupabaseClient() {
  if (typeof window !== "undefined") {
    // Client-side warning only
    console.warn(
      "%c Legacy Supabase Client In Use \n%c Migrate to @wrelik/db (Prisma) or Server Actions immediately.",
      "background: #ff0000; color: #ffffff; font-size: 12px; font-weight: bold; padding: 4px;",
      "color: #ff0000; font-weight: bold;",
    );
  }
  console.warn(
    "getSupabaseClient() called - returning MOCK client. Functionality may be broken.",
  );
  return mockSupabase;
}

export const supabase = mockSupabase;
