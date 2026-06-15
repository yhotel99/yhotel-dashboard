"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";
import {
  listBranchBankAccounts,
  upsertBranchBankAccount,
} from "@/services/bank-accounts";
import type { BranchBankAccount, BranchBankAccountInput } from "@/lib/types";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== USER_ROLE.ADMIN) {
    throw new Error("Chỉ admin mới có quyền cập nhật tài khoản ngân hàng");
  }
  return { supabase, user };
}

export async function listBranchBankAccountsAction(): Promise<
  BranchBankAccount[]
> {
  await requireAuth();
  return listBranchBankAccounts();
}

export async function updateBranchBankAccountAction(
  branchId: string,
  input: BranchBankAccountInput
): Promise<BranchBankAccount> {
  await requireAdmin();
  const account = await upsertBranchBankAccount(branchId, input);
  revalidatePath("/dashboard/settings");
  return account;
}
