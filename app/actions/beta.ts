"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email(),
});

const ticketSchema = z.object({
  subject: z.string().min(5),
  message: z.string().min(10),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
});

export async function joinWaitlist(formData: FormData) {
  const email = formData.get("email");
  const result = waitlistSchema.safeParse({ email });

  if (!result.success) {
    return { error: "Invalid email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email: result.data.email,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You are already on the waitlist!" };
    }
    return { error: "Failed to join waitlist" };
  }

  return { success: true };
}

export async function submitSupportTicket(data: any) {
  const result = ticketSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid ticket data" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to submit a ticket" };
  }

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    subject: result.data.subject,
    message: result.data.message,
    priority: result.data.priority,
  });

  if (error) {
    return { error: "Failed to submit ticket" };
  }

  return { success: true };
}
