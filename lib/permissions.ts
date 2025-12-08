import { USER_ROLE } from "./constants";

const PERMISSIONS = {
  [USER_ROLE.ADMIN]: [
    "view:dashboard",
    "view:users",
    "view:bookings",
    "view:rooms",
    "view:payments",
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
