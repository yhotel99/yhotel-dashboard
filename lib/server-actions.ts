"use server";

import { hasViewPermission, getFirstAllowedPage } from "@/lib/permissions";
import { canViewAllBranches } from "@/lib/branch";
import { ADMIN_MANAGER_ONLY_PATHS, DASHBOARD_URLS } from "@/lib/constants";
import { Profile } from "./types";
import { User } from "@supabase/supabase-js";

// Mapping between URL paths and resource names
const PATH_TO_RESOURCE: Record<string, string> = {
  [DASHBOARD_URLS.DASHBOARD]: "dashboard",
  [DASHBOARD_URLS.ANALYTICS]: "dashboard",
  [DASHBOARD_URLS.ROOMS]: "rooms",
  [DASHBOARD_URLS.BOOKINGS]: "bookings",
  [DASHBOARD_URLS.RESERVATION]: "reservations",
  [DASHBOARD_URLS.CUSTOMERS]: "customers",
  [DASHBOARD_URLS.PAYMENTS]: "payments",
  [DASHBOARD_URLS.VOUCHERS]: "vouchers",
  [DASHBOARD_URLS.REFUND_REQUESTS]: "refund-requests",
  [DASHBOARD_URLS.GALLERY]: "gallery",
  [DASHBOARD_URLS.USERS]: "users",
  [DASHBOARD_URLS.BLOGS]: "blogs",
  [DASHBOARD_URLS.SETTINGS]: "settings",
};

// Get resource name from pathname
function getResourceFromPath(pathname: string): string | null {
  // Check exact matches first
  if (PATH_TO_RESOURCE[pathname]) {
    return PATH_TO_RESOURCE[pathname];
  }

  // Match longest path prefix first (e.g. /dashboard/reservation/kanban → reservations, not dashboard)
  const sortedPaths = Object.entries(PATH_TO_RESOURCE).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [path, resource] of sortedPaths) {
    if (pathname.startsWith(path + "/") || pathname === path) {
      return resource;
    }
  }

  return null;
}

/**
 * Server action to check route permission status (without redirect)
 * Returns permission status and fallback URL
 * Now uses async permission checks from database
 */
export async function checkRoutePermissionStatus(
  pathname: string,
  user: User | null,
  profile: Profile | null
): Promise<{ hasPermission: boolean; fallbackUrl: string }> {
  if (!user || !profile) {
    return { hasPermission: false, fallbackUrl: "/login" };
  }

  const isAdminManagerOnlyRoute = ADMIN_MANAGER_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isAdminManagerOnlyRoute) {
    return {
      hasPermission: canViewAllBranches(profile.role),
      fallbackUrl: await getFirstAllowedPage(profile.role),
    };
  }

  // Get resource from pathname
  const resource = getResourceFromPath(pathname);

  // If resource is null (not found in mapping), allow access (fallback)
  // Otherwise, check if user has permission for that resource (async from database)
  const hasPermission = !resource || (await hasViewPermission(profile.role, resource));

  // Get fallback URL (first allowed page for the role) - now async
  const fallbackUrl = await getFirstAllowedPage(profile.role);

  return { hasPermission, fallbackUrl };
}
