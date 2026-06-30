export const BRANCH_STORAGE_KEY = "yhotel_selected_branch_id";

export function readStoredBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BRANCH_STORAGE_KEY);
}
