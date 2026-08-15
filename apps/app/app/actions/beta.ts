"use server";

import { createLegacyServerDbClient as createServerDbClient } from "@/lib/data-access/server";
import { getCurrentUser } from "@/lib/adapters/auth";
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

  const supabase = await createServerDbClient();
  const sessionUser = await getCurrentUser();

  if (!sessionUser?.id) {
    return { error: "You must be logged in to submit a ticket" };
  }

  const { error } = await supabase.from("support_tickets").insert({
    user_id: sessionUser.id,
    subject: result.data.subject,
    message: result.data.message,
    priority: result.data.priority,
  });

  if (error) {
    return { error: "Failed to submit ticket" };
  }

  return { success: true };
}
