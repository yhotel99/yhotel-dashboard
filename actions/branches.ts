"use server";

import { revalidatePath } from "next/cache";
import {
  createBranch,
  listBranches,
  softDeleteBranch,
  updateBranch,
} from "@/services/branches";
import type { BranchInput } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== USER_ROLE.ADMIN) {
    throw new Error("Chỉ admin mới có quyền quản lý chi nhánh");
  }
}

export async function listBranchesAction() {
  await requireAdmin();
  return listBranches();
}

export async function createBranchAction(input: BranchInput) {
  await requireAdmin();
  const branch = await createBranch(input);
  revalidatePath("/dashboard/branches");
  return branch;
}

export async function updateBranchAction(
  id: string,
  input: Partial<BranchInput>
) {
  await requireAdmin();
  const branch = await updateBranch(id, input);
  revalidatePath("/dashboard/branches");
  return branch;
}

export async function deleteBranchAction(id: string) {
  await requireAdmin();
  await softDeleteBranch(id);
  revalidatePath("/dashboard/branches");
}
