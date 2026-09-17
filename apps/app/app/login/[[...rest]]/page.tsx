import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignIn } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { drxClerkAuthAppearance } from "@/lib/adapters/auth/appearance";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";
import { isAuthVisualFixtureEnabled } from "@/lib/auth/visual-fixtures";

export const metadata: Metadata = {
  title: "Sign in | Deelrx CRM",
  description: "Sign in to your Deelrx CRM business.",
};

export default async function LoginPage() {
  const useVisualFixture = isAuthVisualFixtureEnabled();
  const userId = useVisualFixture ? null : (await auth()).userId;

  if (userId) redirect("/dashboard");

  return (
    <AuthShell
      eyebrow="Operator access"
      description="Sign in to open your business."
    >
      {useVisualFixture ? (
        <AuthVisualFixture mode="sign-in" />
      ) : (
        <SignIn
          routing="path"
          path="/login"
          appearance={drxClerkAuthAppearance}
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />
      )}
    </AuthShell>
  );
}
