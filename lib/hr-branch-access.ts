import {
  type HrUser,
  HrUserRole,
} from "@/types/hr-shifts";

export function isAdminUser(role: HrUserRole | string): boolean {
  return role === HrUserRole.ADMIN || role === HrUserRole.BRANCH_ADMIN;
}

/**
 * PMS: role ADMIN luôn xem toàn hệ thống (kể cả khi HR gán branch_id).
 * HR app giới hạn ADMIN có branch_id — PMS không áp dụng rule đó.
 */
export function isUnscopedAdmin(user: HrUser): boolean {
  return user.role === HrUserRole.ADMIN;
}

/** Chỉ BRANCH_ADMIN mới bị khóa theo chi nhánh trên PMS. */
export function isBranchScopedAdmin(user: HrUser): boolean {
  return user.role === HrUserRole.BRANCH_ADMIN && !!user.branchId;
}

export function getAdminBranchId(user: HrUser): string | undefined {
  return isBranchScopedAdmin(user) ? user.branchId : undefined;
}

export function isStaffUser(user: HrUser): boolean {
  return !isAdminUser(user.role);
}

export function filterUsersForAdmin(
  users: HrUser[],
  admin: HrUser
): HrUser[] {
  const branchId = getAdminBranchId(admin);
  if (!branchId) return users;
  return users.filter((u) => u.branchId === branchId);
}

export function filterStaffForAdmin(
  users: HrUser[],
  admin: HrUser
): HrUser[] {
  return filterUsersForAdmin(users, admin).filter(isStaffUser);
}

export function filterByBranchUserIds<T extends { userId: string }>(
  items: T[],
  allowedUserIds: Set<string>
): T[] {
  return items.filter((item) => allowedUserIds.has(item.userId));
}
