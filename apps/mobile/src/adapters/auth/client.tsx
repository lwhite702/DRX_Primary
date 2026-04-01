import React from "react";
import { ClerkProvider, useAuth as useClerkAuth, useSignIn, useUser } from "@clerk/clerk-expo";
import type { WorkflowSession } from "@wrelik/auth/shared";
import { mapClerkToSession } from "@wrelik/auth/client";

export { ClerkProvider, useClerkAuth, useSignIn, useUser };

export function toWorkflowSession(authLike: {
  userId?: string | null;
  orgId?: string | null;
  session?: { user?: { publicMetadata?: unknown } };
} | null): WorkflowSession {
  return mapClerkToSession(authLike);
}

export type MobileWorkflowSession = WorkflowSession;
