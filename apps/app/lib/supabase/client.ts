/**
 * Legacy compatibility shim for historical Supabase client imports.
 *
 * This module is intentionally non-functional in production paths.
 * Any runtime usage must be migrated to server actions or @wrelik/db.
 */

function fail(method: string): never {
  throw new Error(
    `Legacy Supabase client usage is blocked (${method}). Migrate this path to @wrelik/db or server-side adapters.`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blockedClient: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "toString") return () => "[blocked-supabase-client]";
      return () => fail(String(prop));
    },
    apply() {
      return fail("apply");
    },
  },
);

export function getSupabaseClient() {
  return blockedClient;
}

export const supabase = blockedClient;
