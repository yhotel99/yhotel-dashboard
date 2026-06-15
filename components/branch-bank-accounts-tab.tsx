"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { updateBranchBankAccountAction } from "@/actions/bank-accounts";
import type { BranchBankAccount, BranchBankAccountInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BranchBankFormState = BranchBankAccountInput;

function emptyForm(): BranchBankFormState {
  return {
    bank_account_number: "",
    bank_name: "",
    bank_bin: "",
    bank_account_owner: "",
  };
}

function accountToForm(account: BranchBankAccount): BranchBankFormState {
  return {
    bank_account_number: account.bank_account_number ?? "",
    bank_name: account.bank_name ?? "",
    bank_bin: account.bank_bin ?? "",
    bank_account_owner: account.bank_account_owner ?? "",
  };
}

interface BranchBankAccountsTabProps {
  accounts: BranchBankAccount[];
  canEditBank: boolean;
}

export function BranchBankAccountsTab({
  accounts,
  canEditBank,
}: BranchBankAccountsTabProps) {
  const [forms, setForms] = useState<Record<string, BranchBankFormState>>(() => {
    const initial: Record<string, BranchBankFormState> = {};
    for (const account of accounts) {
      initial[account.branch_id] = accountToForm(account);
    }
    return initial;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const updateField = (
    branchId: string,
    field: keyof BranchBankFormState,
    value: string
  ) => {
    setForms((prev) => ({
      ...prev,
      [branchId]: {
        ...(prev[branchId] ?? emptyForm()),
        [field]: value,
      },
    }));
  };

  const handleSave = async (account: BranchBankAccount) => {
    const form = forms[account.branch_id] ?? emptyForm();
    setSavingId(account.branch_id);
    try {
      const input: BranchBankAccountInput = {
        bank_account_number: form.bank_account_number?.trim() || null,
        bank_name: form.bank_name?.trim() || null,
        bank_bin: form.bank_bin?.trim() || null,
        bank_account_owner: form.bank_account_owner?.trim() || null,
      };
      await updateBranchBankAccountAction(account.branch_id, input);
      await mutate("/api/branch-bank-accounts");
      toast.success(`Đã lưu TK ngân hàng cho ${account.branch_name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể lưu tài khoản";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có chi nhánh nào để cấu hình tài khoản ngân hàng.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mỗi chi nhánh có một tài khoản ngân hàng riêng cho mã QR thanh toán.
        {!canEditBank
          ? " Chỉ admin mới có quyền chỉnh sửa."
          : null}
      </p>
      <div className="grid gap-4">
        {accounts.map((account) => {
          const form = forms[account.branch_id] ?? accountToForm(account);
          const readOnly = !canEditBank;
          return (
            <Card key={account.branch_id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{account.branch_name}</CardTitle>
                <CardDescription>
                  Mã chi nhánh: <span className="font-mono">{account.branch_code}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`bank-acc-${account.branch_id}`}>
                      Số tài khoản
                    </Label>
                    <Input
                      id={`bank-acc-${account.branch_id}`}
                      placeholder="VD: 22102003"
                      value={form.bank_account_number ?? ""}
                      onChange={(e) =>
                        updateField(
                          account.branch_id,
                          "bank_account_number",
                          e.target.value
                        )
                      }
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`bank-name-${account.branch_id}`}>
                      Tên ngân hàng
                    </Label>
                    <Input
                      id={`bank-name-${account.branch_id}`}
                      placeholder="VD: ACB"
                      value={form.bank_name ?? ""}
                      onChange={(e) =>
                        updateField(account.branch_id, "bank_name", e.target.value)
                      }
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`bank-bin-${account.branch_id}`}>
                      Mã BIN ngân hàng
                    </Label>
                    <Input
                      id={`bank-bin-${account.branch_id}`}
                      placeholder="VD: 970416"
                      value={form.bank_bin ?? ""}
                      onChange={(e) =>
                        updateField(account.branch_id, "bank_bin", e.target.value)
                      }
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`bank-owner-${account.branch_id}`}>
                      Chủ tài khoản
                    </Label>
                    <Input
                      id={`bank-owner-${account.branch_id}`}
                      placeholder="VD: TRAN QUANG KHAI"
                      value={form.bank_account_owner ?? ""}
                      onChange={(e) =>
                        updateField(
                          account.branch_id,
                          "bank_account_owner",
                          e.target.value
                        )
                      }
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                </div>
                {canEditBank ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={savingId === account.branch_id}
                      onClick={() => handleSave(account)}
                    >
                      {savingId === account.branch_id
                        ? "Đang lưu..."
                        : "Lưu chi nhánh này"}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
