"use server";

import { getCurrentUser } from "@/lib/adapters/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { z } from "zod";

const ticketSchema = z.object({
  subject: z.string().min(5),
  message: z.string().min(10),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
}).strict();

export async function submitSupportTicket(data: unknown) {
  const result = ticketSchema.safeParse(data);

  if (!result.success) {
    return {
      error: "Invalid ticket data",
      validationErrors: result.error.flatten().fieldErrors,
    };
  }

  const sessionUser = await getCurrentUser();

  if (!sessionUser?.id) {
    return { error: "You must be logged in to submit a ticket" };
  }

  const token = await getConvexAuthToken(); const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) return { error: "Failed to submit ticket" };
  const client = new ConvexHttpClient(url); client.setAuth(token);
  await client.mutation(api.support.createTicket, result.data);

  return { success: true };
}
