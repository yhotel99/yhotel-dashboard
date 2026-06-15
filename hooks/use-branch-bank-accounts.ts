"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { fetcher } from "@/lib/fetcher";
import type { BranchBankAccount } from "@/lib/types";
import { resolveBankInfo, type BankInfoForQr } from "@/lib/bank-info";
import { DEFAULT_BRANCH_ID } from "@/lib/constants";

export function useBranchBankAccounts() {
  const { data, error, isLoading, mutate } = useSWR<BranchBankAccount[]>(
    "/api/branch-bank-accounts",
    fetcher,
    { revalidateOnFocus: false }
  );

  const bankMap = useMemo(() => {
    const map = new Map<string, BranchBankAccount>();
    for (const item of data ?? []) {
      map.set(item.branch_id, item);
    }
    return map;
  }, [data]);

  const getBankInfo = (branchId: string | null | undefined): BankInfoForQr | null => {
    const id = branchId ?? DEFAULT_BRANCH_ID;
    const account = bankMap.get(id);
    if (!account) return null;
    return resolveBankInfo(account);
  };

  const getBranchBankAccount = (
    branchId: string | null | undefined
  ): BranchBankAccount | undefined => {
    return bankMap.get(branchId ?? DEFAULT_BRANCH_ID);
  };

  return {
    accounts: data ?? [],
    bankMap,
    getBankInfo,
    getBranchBankAccount,
    isLoading,
    error,
    mutate,
  };
}
