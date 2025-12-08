"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasViewPermission } from "@/lib/permissions";
import { SIDEBAR_URLS } from "@/lib/constants";

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

// Get first allowed page for a role
function getFirstAllowedPage(role: string): string {
  const allowedPages = [
    { url: SIDEBAR_URLS.DASHBOARD, resource: "dashboard" },
    { url: SIDEBAR_URLS.RESERVATION, resource: "reservations" },
    { url: SIDEBAR_URLS.BOOKINGS, resource: "bookings" },
    { url: SIDEBAR_URLS.CUSTOMERS, resource: "customers" },
    { url: SIDEBAR_URLS.ROOMS, resource: "rooms" },
    { url: SIDEBAR_URLS.PAYMENTS, resource: "payments" },
  ];

  for (const page of allowedPages) {
    if (hasViewPermission(role, page.resource)) {
      return page.url;
    }
  }

  // Fallback to reservation
  return SIDEBAR_URLS.RESERVATION;
}

/**
 * Server action to check route permission
 * This will redirect if user doesn't have permission
 */
export async function checkRoutePermission(pathname: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  // Get resource from current pathname
  const resource = getResourceFromPath(pathname);

  // If resource is found and user doesn't have permission, redirect
  if (resource && !hasViewPermission(profile.role, resource)) {
    const allowedPage = getFirstAllowedPage(profile.role);
    redirect(allowedPage);
  }
}
