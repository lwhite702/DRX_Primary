import "server-only";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "./platform-admin";

/** Discovery protection only. The authenticated platform grant is mandatory. */
export async function requirePlatformConsole(consoleKey: string) {
  const configured = process.env.PLATFORM_CONSOLE_SLUG;
  if (!configured || !/^[a-f0-9]{32,64}$/.test(configured) || consoleKey !== configured) {
    notFound();
  }
  try {
    return await requirePlatformAdmin();
  } catch {
    // Unknown route, missing grant, bypass mode and failed auth all fail closed.
    notFound();
  }
}
