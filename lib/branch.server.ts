import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { BranchScope, Profile } from "@/lib/types";
import {
  getBranchScopeFromProfile,
  resolveBranchFilterId,
} from "@/lib/branch";
import { BRANCH_STORAGE_KEY } from "@/lib/branch-storage";

export { canViewAllBranches, getBranchScopeFromProfile, resolveBranchFilterId } from "@/lib/branch";

export async function getCurrentUserBranchScope(): Promise<{
  scope: BranchScope;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { scope: { mode: "all", branchId: null }, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  return {
    scope: getBranchScopeFromProfile(profile as Profile | null),
    profile: (profile as Profile) ?? null,
  };
}

/** Branch filter for list RSC pages: scope + optional ?branchId= + admin cookie. */
export async function resolveListBranchId(
  requestedBranchId?: string | null
): Promise<string | null> {
  const { scope } = await getCurrentUserBranchScope();
  const trimmedRequest = requestedBranchId?.trim() || null;

  if (trimmedRequest) {
    return resolveBranchFilterId(scope, trimmedRequest);
  }

  if (scope.mode === "all") {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(BRANCH_STORAGE_KEY)?.value?.trim() || null;
    if (fromCookie) {
      return resolveBranchFilterId(scope, fromCookie);
    }
  }

  return resolveBranchFilterId(scope, null);
}

/** Throws if the current user cannot access the booking's branch. */
export async function assertCanAccessBooking(bookingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("branch_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    throw new Error("Không tìm thấy booking");
  }

  const { scope } = await getCurrentUserBranchScope();
  const allowedBranchId = resolveBranchFilterId(scope, null);
  if (allowedBranchId && booking.branch_id !== allowedBranchId) {
    throw new Error("Không có quyền thao tác đơn tại chi nhánh này");
  }
}
