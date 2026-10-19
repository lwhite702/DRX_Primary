import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUp } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { drxClerkAuthAppearance } from "@/lib/adapters/auth/appearance";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";
import { isAuthVisualFixtureEnabled } from "@/lib/auth/visual-fixtures";

export const metadata: Metadata = {
  title: "Create an account | Deelrx CRM",
  description: "Create your Deelrx CRM business.",
};

export default async function RegisterPage() {
  const useVisualFixture = isAuthVisualFixtureEnabled();
  const userId = useVisualFixture ? null : (await auth()).userId;

  if (userId) redirect("/dashboard");

  return (
    <AuthShell>
      {useVisualFixture ? (
        <AuthVisualFixture mode="sign-up" />
      ) : (
        <SignUp
          routing="path"
          path="/register"
          appearance={drxClerkAuthAppearance}
          forceRedirectUrl="/onboarding"
          fallbackRedirectUrl="/onboarding"
        />
      )}
    </AuthShell>
  );
}
