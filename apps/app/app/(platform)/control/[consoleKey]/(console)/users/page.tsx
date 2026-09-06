import { requirePlatformConsole } from "@/lib/auth/platform-console";
import { UsersClient } from "@/components/platform/users-client";
export default async function Page({ params }: { params: Promise<{ consoleKey: string }> }) {
  await requirePlatformConsole((await params).consoleKey);
  return <UsersClient />;
}
