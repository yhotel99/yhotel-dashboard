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
 * This function is now async because it needs to check permissions from database
 */
export async function getFirstAllowedPage(role: string): Promise<string> {
  const allowedPages = [
    { url: SIDEBAR_URLS.DASHBOARD, resource: "dashboard" },
    { url: SIDEBAR_URLS.RESERVATION, resource: "reservations" },
    { url: SIDEBAR_URLS.BOOKINGS, resource: "bookings" },
    { url: SIDEBAR_URLS.CUSTOMERS, resource: "customers" },
    { url: SIDEBAR_URLS.ROOMS, resource: "rooms" },
    { url: SIDEBAR_URLS.PAYMENTS, resource: "payments" },
  ];

  for (const page of allowedPages) {
    if (await hasViewPermission(role, page.resource)) {
      return page.url;
    }
  }

  // Fallback to reservation
  return SIDEBAR_URLS.RESERVATION;
}
