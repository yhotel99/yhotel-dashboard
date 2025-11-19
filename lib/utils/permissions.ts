import type { UserRole } from "@/lib/types";

/**
 * Permission utility functions for role-based access control
 * Can be used in both server-side (middleware) and client-side (components)
 */

/**
 * Check if user has admin role
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

/**
 * Check if user has manager role
 */
export function isManager(role: UserRole | null | undefined): boolean {
  return role === "manager";
}

/**
 * Check if user has staff role
 */
export function isStaff(role: UserRole | null | undefined): boolean {
  return role === "staff";
}

/**
 * Check if user has admin or manager role (higher privileges)
 */
export function isAdminOrManager(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  route: string,
  role: UserRole | null | undefined
): boolean {
  // Staff can only access dashboard home, room layout and bookings
  if (isStaff(role)) {
    const allowedRoutes = [
      "/dashboard", // Dashboard home (exact match or starts with)
      "/dashboard/rooms/map", // Room Layout
      "/dashboard/bookings", // Bookings
    ];
    // Check exact match for dashboard home
    if (route === "/dashboard" || route === "/dashboard/") {
      return true;
    }
    // Check other allowed routes
    return allowedRoutes.some((allowedRoute) => route.startsWith(allowedRoute));
  }

  // Admin and Manager can access all dashboard routes
  if (isAdminOrManager(role)) {
    return route.startsWith("/dashboard");
  }

  // No role or unknown role - no access
  return false;
}

/**
 * Get redirect URL for staff when accessing restricted routes
 */
export function getStaffRedirectUrl(route: string): string | null {
  // If staff tries to access restricted route, redirect to room layout
  // Allow dashboard home, room layout, and bookings
  if (
    route.startsWith("/dashboard") &&
    route !== "/dashboard" &&
    route !== "/dashboard/" &&
    !route.startsWith("/dashboard/rooms/map") &&
    !route.startsWith("/dashboard/bookings")
  ) {
    return "/dashboard/rooms/map";
  }
  return null;
}

/**
 * Check if route should be visible in navigation for given role
 */
export function isRouteVisibleInNav(
  route: string,
  role: UserRole | null | undefined
): boolean {
  // Staff can only see Dashboard home, Room Layout and Bookings in nav
  if (isStaff(role)) {
    return (
      route === "/dashboard" ||
      route === "/dashboard/rooms/map" ||
      route === "/dashboard/bookings"
    );
  }

  // Admin and Manager can see all routes
  if (isAdminOrManager(role)) {
    return true;
  }

  return false;
}
