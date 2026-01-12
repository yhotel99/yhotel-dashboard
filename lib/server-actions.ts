"use server";

import { hasViewPermission, getFirstAllowedPage } from "@/lib/permissions";
import { SIDEBAR_URLS } from "@/lib/constants";
import { Profile } from "./types";
import { User } from "@supabase/supabase-js";

// Mapping between URL paths and resource names
const PATH_TO_RESOURCE: Record<string, string> = {
  [SIDEBAR_URLS.DASHBOARD]: "dashboard",
  [SIDEBAR_URLS.ROOMS]: "rooms",
  [SIDEBAR_URLS.BOOKINGS]: "bookings",
  [SIDEBAR_URLS.RESERVATION]: "reservations",
  [SIDEBAR_URLS.CUSTOMERS]: "customers",
  [SIDEBAR_URLS.PAYMENTS]: "payments",
  [SIDEBAR_URLS.REFUND_REQUESTS]: "refund-requests",
  [SIDEBAR_URLS.GALLERY]: "gallery",
  [SIDEBAR_URLS.USERS]: "users",
  [SIDEBAR_URLS.BLOGS]: "blogs",
};

// Get resource name from pathname
function getResourceFromPath(pathname: string): string | null {
  // Check exact matches first
  if (PATH_TO_RESOURCE[pathname]) {
    return PATH_TO_RESOURCE[pathname];
  }

  // Check if pathname starts with any of the paths (for nested routes)
  for (const [path, resource] of Object.entries(PATH_TO_RESOURCE)) {
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

  // Get resource from pathname
  const resource = getResourceFromPath(pathname);

  // If resource is null (not found in mapping), allow access (fallback)
  // Otherwise, check if user has permission for that resource (async from database)
  const hasPermission = !resource || (await hasViewPermission(profile.role, resource));

  // Get fallback URL (first allowed page for the role) - now async
  const fallbackUrl = await getFirstAllowedPage(profile.role);

  return { hasPermission, fallbackUrl };
}
