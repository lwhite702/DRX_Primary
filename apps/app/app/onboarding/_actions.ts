"use server";

import { auth, clerkClient } from "@/lib/adapters/auth/server";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const businessName = String(formData.get("businessName") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const teamSize = String(formData.get("teamSize") || "").trim();
  const tooling = String(formData.get("tooling") || "").trim();

  if (!businessName || !role || !teamSize) {
    throw new Error("Missing required onboarding fields.");
  }

  const claims = sessionClaims as {
    metadata?: Record<string, unknown>;
    publicMetadata?: Record<string, unknown>;
    public_metadata?: Record<string, unknown>;
  };

  const currentMetadata =
    claims?.metadata || claims?.publicMetadata || claims?.public_metadata || {};

  const client = await clerkClient();

  await client.users.updateUser(userId, {
    publicMetadata: {
      ...currentMetadata,
      onboardingComplete: true,
      operatorProfile: {
        businessName,
        role,
        teamSize,
        tooling,
      },
    },
  });

  redirect("/dashboard");
}
