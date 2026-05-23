import type { Branch, BranchScope, Profile, UserRole } from "@/lib/types";
import { DEFAULT_BRANCH_ID, USER_ROLE } from "@/lib/constants";

export function buildBranchNameById(branches: Branch[]): Record<string, string> {
  return Object.fromEntries(branches.map((b) => [b.id, b.name]));
}

export function getBranchTableLabel(
  branchId: string | undefined | null,
  branchNameById: Readonly<Record<string, string>>
): string {
  if (!branchId) return "—";
  return branchNameById[branchId] ?? "—";
}

export function resolveBranchDisplay(
  branchId: string | undefined | null,
  branches: Branch[],
  fallbackBranchId: string = DEFAULT_BRANCH_ID
): { name: string; code: string } {
  const id = branchId ?? fallbackBranchId;
  const branch = branches.find((b) => b.id === id);
  if (branch) {
    return { name: branch.name, code: branch.code };
  }
  return {
    name: branchId ? "Không xác định" : "Chi nhánh mặc định",
    code: "—",
  };
}

export function canViewAllBranches(role: UserRole): boolean {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER;
}

export function getBranchScopeFromProfile(profile: Profile | null): BranchScope {
  if (!profile) {
    return { mode: "all", branchId: null };
  }
  if (canViewAllBranches(profile.role)) {
    return { mode: "all", branchId: null };
  }
  if (profile.branch_id) {
    return { mode: "single", branchId: profile.branch_id };
  }
  return { mode: "all", branchId: null };
}

export function resolveBranchFilterId(
  scope: BranchScope,
  requestedBranchId?: string | null
): string | null {
  if (scope.mode === "single") {
    return scope.branchId;
  }
  return requestedBranchId?.trim() || null;
}
