"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BusinessSetupWizard } from "@/components/onboarding/business-setup-wizard";
import { useBusiness } from "@/lib/hooks/use-business";

export function BusinessSetupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { needsSetup, loading } = useBusiness();
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (needsSetup && userId) {
    return <BusinessSetupWizard userId={userId} />;
  }

  return <>{children}</>;
}
