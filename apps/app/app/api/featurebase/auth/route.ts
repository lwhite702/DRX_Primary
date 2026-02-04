import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@/lib/supabase/server";

// API Key from environment variables (secured in .env.local)
const FEATUREBASE_API_KEY = process.env.FEATUREBASE_API_KEY;
const FEATUREBASE_JWT_SECRET = process.env.FEATUREBASE_JWT_SECRET;

export async function GET(request: Request) {
  if (!FEATUREBASE_JWT_SECRET) {
    console.error("FEATUREBASE_JWT_SECRET is not defined.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
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
