import { requirePlatformConsole } from "@/lib/auth/platform-console";
import { BusinessesClient } from "@/components/platform/businesses-client";
export default async function Page({ params }: { params: Promise<{ consoleKey: string }> }) {
  await requirePlatformConsole((await params).consoleKey);
  return <BusinessesClient />;
}
