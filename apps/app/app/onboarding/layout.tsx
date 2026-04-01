import { auth } from "@/lib/adapters/auth/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const claims = sessionClaims as {
    metadata?: { onboardingComplete?: boolean };
    publicMetadata?: { onboardingComplete?: boolean };
    public_metadata?: { onboardingComplete?: boolean };
  };
  const onboardingComplete =
    claims?.metadata?.onboardingComplete === true ||
    claims?.publicMetadata?.onboardingComplete === true ||
    claims?.public_metadata?.onboardingComplete === true;

  if (onboardingComplete) {
    redirect("/dashboard");
  }

  return children;
}
