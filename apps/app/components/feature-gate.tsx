"use client";

import { useFeatureFlag } from "@/lib/hooks/use-feature-flag";
import { ReactNode } from "react";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback = null,
  showLoading = false,
}: FeatureGateProps) {
  const { isEnabled, loading } = useFeatureFlag(feature);

  if (loading && showLoading) {
    return <div className="animate-pulse bg-muted h-10 w-full rounded" />;
  }

  if (loading && !showLoading) {
    return null; // Or return fallback? Usually avoid flash of fallback content
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
