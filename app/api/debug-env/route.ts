import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10),
  });
}
