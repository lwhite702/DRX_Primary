"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { BusinessSetupWizard } from "@/components/onboarding/business-setup-wizard";
import { getSupabaseClient } from "@/lib/supabase/client";

export function BusinessSetupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { needsSetup, loading, refreshBusiness } = useBusiness();
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function getUser() {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (needsSetup && userId) {
    return <BusinessSetupWizard userId={userId} onComplete={refreshBusiness} />;
  }

  return <>{children}</>;
}
