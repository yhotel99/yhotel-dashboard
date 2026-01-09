import { SIDEBAR_URLS, USER_ROLE } from "./constants";

const PERMISSIONS = {
  [USER_ROLE.ADMIN]: [
    "view:dashboard",
    "view:users",
    "view:bookings",
    "view:rooms",
    "view:payments",
    "view:payment-logs",
    "view:reports",
    "view:gallery",
    "view:blogs",
    "view:settings",
    "view:customers",
    "view:refund-requests",
    "view:reservations",
  ],
  [USER_ROLE.MANAGER]: [
    "view:dashboard",
    "view:users",
    "view:bookings",
    "view:rooms",
    "view:payments",
    "view:payment-logs",
    "view:reports",
    "view:gallery",
    "view:blogs",
    "view:settings",
    "view:customers",
    "view:refund-requests",
    "view:reservations",
  ],
  [USER_ROLE.STAFF]: ["view:reservations", "view:bookings", "view:customers"],
};

export const checkPermission = (
  role: string,
  action: string,
  resource: string
) => {
  const permissions = PERMISSIONS[role as keyof typeof PERMISSIONS];
  if (!permissions) return false;
  return permissions.includes(`${action}:${resource}`);
};

export const hasViewPermission = (role: string, resource: string) => {
  return checkPermission(role, "view", resource);
};

export function getFirstAllowedPage(role: string): string {
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
