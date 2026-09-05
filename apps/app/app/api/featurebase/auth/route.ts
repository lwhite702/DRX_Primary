import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/adapters/auth";
import { clerkClient } from "@/lib/adapters/auth/server";

const FEATUREBASE_JWT_SECRET = process.env.FEATUREBASE_JWT_SECRET;

export async function GET(request: Request) {
  if (!FEATUREBASE_JWT_SECRET) {
    console.error("FEATUREBASE_JWT_SECRET is not defined.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userProfile = await db.user.findFirst({
    where: { clerkUserId: user.id },
    select: { email: true, name: true },
  });

  if (!userProfile?.email) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(user.id);
    const fallbackEmail = clerkUser.primaryEmailAddress?.emailAddress;

    if (!fallbackEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fallbackName =
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.firstName ??
          clerkUser.lastName ??
          clerkUser.username ??
          fallbackEmail.split("@")[0] ??
          "User";

    userProfile = {
      email: fallbackEmail,
      name: fallbackName,
    };
  }

  try {
    // Generate JWT for Featurebase SSO
    // The instructions say: "Generate a JWT ... using your Featurebase API Key as the secret"
    // Claims:
    // - id: Featurebase User ID (optional, we use external ID usually)
    // - userId: Your system's User ID
    // - email: User's email
    // - name: User's name
    // - exp: Expiration time (optional but recommended)

    const token = jwt.sign(
      {
        userId: user.id,
        email: userProfile.email,
        name: userProfile.name || userProfile.email.split("@")[0] || "User",
      },
      FEATUREBASE_JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" },
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating Featurebase JWT:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
