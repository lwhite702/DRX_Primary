"use client";

import { ReactNode } from "react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { Permission, Role } from "@/lib/auth/permissions";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: Role[];
  fallback?: ReactNode;
}

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission: Permission;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { role, loading } = useUserRole();

  if (loading) {
    return null; // Or a skeleton?
  }

  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function PermissionGuard({
  children,
  requiredPermission,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, loading } = useUserRole();

  if (loading) {
    return null; // Or a skeleton?
  }

  if (!hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
