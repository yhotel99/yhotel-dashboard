"use server";

import { SIDEBAR_URLS } from "./constants";
import * as permissionsService from "@/services/permissions";

// Server-side permission checking functions
// Now uses database instead of hardcoded PERMISSIONS object

export async function checkPermission(
  role: string,
  action: string,
  resource: string
): Promise<boolean> {
  return permissionsService.checkPermission(role, action, resource);
}

export async function hasViewPermission(
  role: string,
  resource: string
): Promise<boolean> {
  return permissionsService.hasViewPermission(role, resource);
}

/**
 * Get first allowed page for a role
 * OPTIMIZED: Fetch permissions once and check all pages
 */
export async function getFirstAllowedPage(role: string): Promise<string> {
  // Fetch permissions once for this role
  const permissions = await permissionsService.getPermissionsByRole(role);

  const allowedPages = [
    { url: SIDEBAR_URLS.DASHBOARD, resource: "dashboard" },
    { url: SIDEBAR_URLS.RESERVATION, resource: "reservations" },
    { url: SIDEBAR_URLS.BOOKINGS, resource: "bookings" },
    { url: SIDEBAR_URLS.CUSTOMERS, resource: "customers" },
    { url: SIDEBAR_URLS.ROOMS, resource: "rooms" },
    { url: SIDEBAR_URLS.PAYMENTS, resource: "payments" },
  ];

  // Check all pages with cached permissions (no additional DB queries)
  for (const page of allowedPages) {
    const permissionName = `view:${page.resource}`;
    if (permissions.has(permissionName)) {
      return page.url;
    }
  }

  // Fallback to reservation
  return SIDEBAR_URLS.RESERVATION;
}
