import "server-only";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "./platform-admin";
import { isAuthBypassEnabled } from "@/lib/adapters/auth/server";

/** Validate discovery routing only; never authorizes platform data. */
export function requirePlatformEntryKey(consoleKey: string) {
  const configured = process.env.PLATFORM_CONSOLE_SLUG;
  if (isAuthBypassEnabled() || !configured || !/^[a-f0-9]{32,64}$/.test(configured) || consoleKey !== configured) {
    notFound();
  }
}

/** Discovery protection only. The authenticated platform grant is mandatory. */
export async function requirePlatformConsole(consoleKey: string) {
  requirePlatformEntryKey(consoleKey);
  try {
    return await requirePlatformAdmin();
  } catch {
    // Unknown route, missing grant, bypass mode and failed auth all fail closed.
    notFound();
  }
}
