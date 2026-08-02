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
  /** Only used when explicitly passed — do not silently map null → main. */
  fallbackBranchId?: string | null
): { name: string; code: string } {
  const id = branchId ?? fallbackBranchId ?? null;
  if (!id) {
    return { name: "—", code: "—" };
  }
  const branch = branches.find((b) => b.id === id);
  if (branch) {
    return { name: branch.name, code: branch.code };
  }
  return {
    name: "Không xác định",
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

export function getBranchCodeById(
  branchId: string | undefined | null,
  branches: Branch[]
): string | null {
  if (!branchId) return null;
  const branch = branches.find((b) => b.id === branchId);
  return branch?.code ?? null;
}

export function getDefaultFormBranchId(params: {
  profile: Profile | null;
  filterBranchId: string | null;
  effectiveBranchId: string | null;
}): string {
  const { profile, filterBranchId, effectiveBranchId } = params;
  if (filterBranchId) return filterBranchId;
  if (profile && !canViewAllBranches(profile.role) && profile.branch_id) {
    return profile.branch_id;
  }
  return effectiveBranchId ?? DEFAULT_BRANCH_ID;
}

export function resolveBranchIdForSubmit(
  scope: BranchScope,
  formBranchId: string | undefined | null,
  filterBranchId?: string | null
): string {
  const resolved = resolveBranchFilterId(scope, formBranchId ?? filterBranchId);
  return resolved ?? DEFAULT_BRANCH_ID;
}

export function getCurrentUserBranchLabel(params: {
  profile: Profile | null;
  branches: Branch[];
  canSelectBranch: boolean;
  selectedBranchId: string | null;
}): string | null {
  const { profile, branches, canSelectBranch, selectedBranchId } = params;
  if (!profile) return null;

  if (canSelectBranch) {
    if (selectedBranchId) {
      return resolveBranchDisplay(selectedBranchId, branches).name;
    }
    return "Tất cả chi nhánh";
  }

  if (profile.branch_id) {
    return resolveBranchDisplay(profile.branch_id, branches).name;
  }

  return null;
}
