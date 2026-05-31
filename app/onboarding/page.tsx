import { Metadata } from "next";
import dynamic from "next/dynamic";

const CreateOrganization = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.CreateOrganization),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full max-w-md animate-pulse rounded-lg border border-white/10 bg-black/30" />
    ),
  },
);

export const metadata: Metadata = {
  title: "Create Organization | DeelRx",
  description: "Set up your workspace.",
};

export default function OnboardingPage() {
  const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Create your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Create an organization to manage your inventory and team.
            </p>
          </div>
          <div className="flex justify-center">
            {hasClerkPublishableKey ? (
              <CreateOrganization
                afterCreateOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    formButtonPrimary:
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                    card: "bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl",
                    headerTitle:
                      "text-2xl font-bold tracking-tight text-foreground hidden", // Hidden since we have our own header
                    headerSubtitle: "text-muted-foreground hidden",
                    formFieldLabel: "text-foreground",
                    formFieldInput:
                      "bg-background border-white/10 text-foreground",
                  },
                }}
              />
            ) : (
              <div className="w-full rounded-lg border border-white/10 bg-black/30 p-5 text-sm text-muted-foreground">
                Clerk is not configured in this environment yet. Add your publishable key to enable workspace setup.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-muted/10 border-l border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Team collaboration built-in
            </h2>
            <p className="text-lg text-muted-foreground">
              Invite your team, manage roles, and work together in your shared
              workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
