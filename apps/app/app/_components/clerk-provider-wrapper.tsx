"use client";

import React from "react";
import { ClerkProvider } from "@/lib/adapters/auth/ui";

export default function ClerkProviderWrapper({
  children,
  isBypassActive,
  bypassUserId,
  bypassOrgId,
  ...props
}: any) {
  return (
    <ClerkProvider
      isBypassActive={isBypassActive}
      bypassUserId={bypassUserId}
      bypassOrgId={bypassOrgId}
      {...props}
    >
      {children}
    </ClerkProvider>
  );
}
