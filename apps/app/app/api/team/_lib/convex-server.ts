import { NextResponse } from "next/server";
export { businessClient as teamClient } from "@/lib/business/convex-server";
export function teamFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const entries: Array<[string, number, string]> = [
    ["ALREADY_EXISTS:", 409, "A membership or active invitation already exists for this email"],
    ["OWNER_PROTECTED:", 409, "The business owner cannot be removed"],
    ["NOT_FOUND:", 404, "Member not found"], ["UNAUTHORIZED:", 401, "Unauthorized"],
    ["FORBIDDEN:", 403, "You do not have permission to manage this member"],
    ["CONFLICT:", 409, "You cannot change your own membership"],
    ["INVALID_ARGUMENT:", 400, "Invalid team request"],
  ];
  const entry = entries.find(([code]) => message.includes(code));
  return NextResponse.json({ error: entry?.[2] ?? "Team service is temporarily unavailable" }, { status: entry?.[1] ?? 503, headers: { "Cache-Control": "private, no-store" } });
}
