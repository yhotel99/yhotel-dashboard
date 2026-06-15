import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BranchBankAccount, BranchBankAccountInput } from "@/lib/types";

type BranchWithBankRow = {
  id: string;
  code: string;
  name: string;
  branch_bank_accounts:
    | {
        bank_account_number: string | null;
        bank_name: string | null;
        bank_bin: string | null;
        bank_account_owner: string | null;
        updated_at: string | null;
      }
    | {
        bank_account_number: string | null;
        bank_name: string | null;
        bank_bin: string | null;
        bank_account_owner: string | null;
        updated_at: string | null;
      }[]
    | null;
};

function mapBranchRow(row: BranchWithBankRow): BranchBankAccount {
  const bank = Array.isArray(row.branch_bank_accounts)
    ? row.branch_bank_accounts[0]
    : row.branch_bank_accounts;

  return {
    branch_id: row.id,
    branch_code: row.code,
    branch_name: row.name,
    bank_account_number: bank?.bank_account_number ?? null,
    bank_name: bank?.bank_name ?? null,
    bank_bin: bank?.bank_bin ?? null,
    bank_account_owner: bank?.bank_account_owner ?? null,
    updated_at: bank?.updated_at ?? null,
  };
}

/**
 * List bank accounts for all active branches (single query, LEFT JOIN).
 */
export async function listBranchBankAccounts(): Promise<BranchBankAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select(
      `
      id,
      code,
      name,
      branch_bank_accounts (
        bank_account_number,
        bank_name,
        bank_bin,
        bank_account_owner,
        updated_at
      )
    `
    )
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BranchWithBankRow[]).map(mapBranchRow);
}

export const listBranchBankAccountsCached = cache(listBranchBankAccounts);

export async function getBranchBankAccount(
  branchId: string
): Promise<BranchBankAccount | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select(
      `
      id,
      code,
      name,
      branch_bank_accounts (
        bank_account_number,
        bank_name,
        bank_bin,
        bank_account_owner,
        updated_at
      )
    `
    )
    .eq("id", branchId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBranchRow(data as BranchWithBankRow);
}

export const getBranchBankAccountCached = cache(getBranchBankAccount);

export async function upsertBranchBankAccount(
  branchId: string,
  input: BranchBankAccountInput
): Promise<BranchBankAccount> {
  const supabase = await createClient();
  const payload = {
    branch_id: branchId,
    bank_account_number: input.bank_account_number ?? null,
    bank_name: input.bank_name ?? null,
    bank_bin: input.bank_bin ?? null,
    bank_account_owner: input.bank_account_owner ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("branch_bank_accounts")
    .upsert(payload, { onConflict: "branch_id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const account = await getBranchBankAccount(branchId);
  if (!account) {
    throw new Error("Không thể tải tài khoản ngân hàng sau khi lưu");
  }
  return account;
}

export type PublicQrDisplayPayload = {
  branch: { id: string; code: string; name: string };
  bank: {
    bank_account_number: string | null;
    bank_name: string | null;
    bank_bin: string | null;
    bank_account_owner: string | null;
  };
  display: {
    booking_id: string;
    booking_code: string;
    customer_name: string | null;
    room_name: string | null;
    check_in: string;
    check_out: string;
    total_amount: number;
    final_amount: number | null;
    updated_at: string;
    branch_id: string;
  };
};

/**
 * Public QR init payload — only returns data when qr_display_state is active.
 */
export async function getPublicQrDisplayPayload(
  branchCode: string
): Promise<PublicQrDisplayPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_qr_display_payload", {
    p_branch_code: branchCode.trim().toLowerCase(),
  });

  if (error || !data) {
    return null;
  }

  return data as PublicQrDisplayPayload;
}
