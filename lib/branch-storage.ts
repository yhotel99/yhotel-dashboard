export const BRANCH_STORAGE_KEY = "yhotel_selected_branch_id";

export function readStoredBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BRANCH_STORAGE_KEY);
}

export function writeStoredBranchId(branchId: string | null): void {
  if (typeof window === "undefined") return;
  if (branchId) {
    window.localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
    document.cookie = `${BRANCH_STORAGE_KEY}=${encodeURIComponent(branchId)}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(BRANCH_STORAGE_KEY);
    document.cookie = `${BRANCH_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}
