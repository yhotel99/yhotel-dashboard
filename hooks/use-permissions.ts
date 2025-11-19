"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  isAdmin,
  isManager,
  isStaff,
  isAdminOrManager,
  canAccessRoute,
  isRouteVisibleInNav,
} from "@/lib/utils/permissions";
import type { UserRole } from "@/lib/types";

/**
 * Client-side hook for permission checks
 * Uses auth context to get user role and provides permission checking functions
 */
export function usePermissions() {
  const { profile, isLoading } = useAuth();

  const role: UserRole | null | undefined = profile?.role;

  return {
    role,
    isLoading,
    // Role checks
    isAdmin: isAdmin(role),
    isManager: isManager(role),
    isStaff: isStaff(role),
    isAdminOrManager: isAdminOrManager(role),
    // Permission checks
    canAccessRoute: (route: string) => canAccessRoute(route, role),
    isRouteVisibleInNav: (route: string) => isRouteVisibleInNav(route, role),
  };
}
