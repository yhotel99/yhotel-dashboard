import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";

export async function resolveReportBranchId(
  requestedBranchId?: string | null
): Promise<string | null> {
  const { scope } = await getCurrentUserBranchScope();
  return resolveBranchFilterId(scope, requestedBranchId);
}

export function applyBranchFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  branchId: string | null
): T {
  if (branchId) {
    return query.eq("branch_id", branchId);
  }
  return query;
}

export async function getReportBranchIdFromRequest(
  searchParams: URLSearchParams
): Promise<string | null> {
  return resolveReportBranchId(searchParams.get("branchId"));
}
