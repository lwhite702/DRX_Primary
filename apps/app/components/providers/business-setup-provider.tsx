"use client";

import { useUser } from "@/lib/adapters/auth/ui";
import { useBusiness } from "@/lib/hooks/use-business";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { BusinessSetupWizard } from "@/components/onboarding/business-setup-wizard";
import { ErrorState } from "@/components/ui/error-state";

export function BusinessSetupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const {
    needsSetup,
    loading: businessLoading,
    refreshBusiness,
    business,
    status: businessStatus,
    error: businessError,
  } = useBusiness();
  const { role, loading: roleLoading } = useUserRole(business?.id);

  if (!isLoaded || businessLoading || (business && roleLoading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (businessStatus === "error" && !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <ErrorState
          title="Your business could not be loaded"
          message={businessError || "Check your connection and try again."}
          onRetry={() => void refreshBusiness()}
        />
      </div>
    );
  }

  // Super admins bypass setup requirement
  if (needsSetup && user && role !== "super_admin") {
    return (
      <BusinessSetupWizard userId={user.id} onComplete={refreshBusiness} />
    );
  }

  return <>{children}</>;
}
