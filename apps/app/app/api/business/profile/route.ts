import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { resolveAuthContext } from "../../pos/_lib/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { z } from "zod";

const profileSchema = z.object({
  businessName: z.string().optional(), business_name: z.string().optional(),
  businessType: z.string().optional(), business_type: z.string().optional(),
  phoneNumber: z.string().optional(), phone_number: z.string().optional(),
  email: z.string().optional(), address: z.string().optional(), city: z.string().optional(),
  state: z.string().optional(), zipCode: z.string().optional(), zip_code: z.string().optional(),
}).strict();
async function connection(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext(request);
  if (!userId || !businessId) throw new Error("UNAUTHORIZED:");
  const token = await getConvexAuthToken();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, businessId, expectedUserId: userId };
}
function response(profile: { createdAt: number; updatedAt: number }) {
  return NextResponse.json({ data: { ...profile, createdAt: new Date(profile.createdAt).toISOString(), updatedAt: new Date(profile.updatedAt).toISOString() } }, { headers: { "Cache-Control": "private, no-store" } });
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const known: Array<[string, number, string]> = [["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "You do not have permission to access or change this business"], ["NOT_FOUND:", 404, "Business is unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid profile payload"]];
  const match = known.find(([code]) => message.includes(code));
  return NextResponse.json({ error: match?.[2] ?? "Business service is temporarily unavailable" }, { status: match?.[1] ?? 503 });
}
export async function GET(request: NextRequest) {
  try {
    const { client, ...context } = await connection(request);
    return response(await client.query(api.businessProfiles.getProfile, context));
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const { client, ...context } = await connection(request);
    const parsed = profileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const body = parsed.data;
    for (const [camel, snake] of [["businessName", "business_name"], ["businessType", "business_type"], ["phoneNumber", "phone_number"], ["zipCode", "zip_code"]] as const) {
      if (body[camel] !== undefined && body[snake] !== undefined && body[camel] !== body[snake]) throw new Error("INVALID_ARGUMENT:");
    }
    return response(await client.mutation(api.businessProfiles.updateProfile, { ...context, patch: {
      businessName: body.businessName ?? body.business_name,
      businessType: body.businessType ?? body.business_type,
      phoneNumber: body.phoneNumber ?? body.phone_number,
      zipCode: body.zipCode ?? body.zip_code,
      address: body.address, city: body.city, state: body.state, email: body.email,
    } }));
  } catch (error) { return failure(error); }
}
