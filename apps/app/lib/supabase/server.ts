/**
 * Database Server Client Adapter
 *
 * This module provides server-side database access through local Prisma.
 * It is intentionally typed as a supabase-compat shim during migration.
 */

import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function createClient() {
  const client = db as any;

  const getUser = async () => {
    const { userId } = await auth();
    if (!userId) {
      return {
        data: { user: null },
        error: { message: "Unauthorized" },
      };
    }
    return {
      data: {
        user: { id: userId },
      },
      error: null,
    };
  };

  if (!client || typeof client !== "object") {
    return { auth: { getUser } };
  }

  if (client.auth?.getUser) {
    return client;
  }

  if (typeof Object.isExtensible === "function" && Object.isExtensible(client)) {
    client.auth = {
      ...(client.auth ? client.auth : {}),
      getUser,
    };
    return client;
  }

  return {
    ...client,
    auth: { ...(client.auth ? client.auth : {}), getUser },
  };
}
