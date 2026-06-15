"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { updateBranchBankAccountAction } from "@/actions/bank-accounts";
import { bankCodeMismatchMessage } from "@/lib/bank-info";
import { SEPAY_BANKS } from "@/lib/sepay-banks";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchBankFormState = BranchBankAccountInput;

function emptyForm(): BranchBankFormState {
  return {
    bank_account_number: "",
    bank_name: "",
    bank_code: "",
    bank_account_owner: "",
  };
}

function accountToForm(account: BranchBankAccount): BranchBankFormState {
  return {
    bank_account_number: account.bank_account_number ?? "",
    bank_name: account.bank_name ?? "",
    bank_code: account.bank_code ?? "",
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

  const selectBank = (branchId: string, code: string) => {
    const bank = SEPAY_BANKS.find((b) => b.code === code);
    if (!bank) return;
    setForms((prev) => ({
      ...prev,
      [branchId]: {
        ...(prev[branchId] ?? emptyForm()),
        bank_name: bank.short_name,
        bank_code: bank.code,
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
        bank_code: form.bank_code?.trim() || null,
        bank_account_owner: form.bank_account_owner?.trim() || null,
      };
      const saved = await updateBranchBankAccountAction(account.branch_id, input);
      setForms((prev) => ({
        ...prev,
        [account.branch_id]: accountToForm(saved),
      }));
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
        Chọn ngân hàng từ danh sách SePay — mã code (VD: TPB, MB) sẽ tự điền.
        {!canEditBank ? " Chỉ admin mới có quyền chỉnh sửa." : null}
      </p>
      <div className="grid gap-4">
        {accounts.map((account) => {
          const form = forms[account.branch_id] ?? accountToForm(account);
          const readOnly = !canEditBank;
          const mismatchWarning = bankCodeMismatchMessage(
            form.bank_name,
            form.bank_code
          );
          const selectedCode = SEPAY_BANKS.find(
            (b) => b.code === form.bank_code?.toUpperCase()
          )?.code;

          return (
            <Card key={account.branch_id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{account.branch_name}</CardTitle>
                <CardDescription>
                  Mã chi nhánh:{" "}
                  <span className="font-mono">{account.branch_code}</span>
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
                      Ngân hàng
                    </Label>
                    {canEditBank ? (
                      <Select
                        value={selectedCode ?? ""}
                        onValueChange={(value) =>
                          selectBank(account.branch_id, value)
                        }
                      >
                        <SelectTrigger
                          id={`bank-name-${account.branch_id}`}
                          className="w-full"
                        >
                          <SelectValue placeholder="Chọn ngân hàng" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEPAY_BANKS.filter((b) => b.supported).map(
                            (bank) => (
                              <SelectItem key={bank.code} value={bank.code}>
                                {bank.short_name} ({bank.code})
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`bank-name-${account.branch_id}`}
                        value={
                          form.bank_name
                            ? `${form.bank_name}${form.bank_code ? ` (${form.bank_code})` : ""}`
                            : ""
                        }
                        readOnly
                        disabled
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`bank-code-${account.branch_id}`}>
                      Mã ngân hàng (SePay)
                    </Label>
                    <Input
                      id={`bank-code-${account.branch_id}`}
                      placeholder="Tự điền khi chọn ngân hàng (VD: TPB)"
                      value={form.bank_code ?? ""}
                      readOnly
                      disabled
                      className="bg-muted font-mono"
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
                {mismatchWarning ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    {mismatchWarning}
                  </p>
                ) : null}
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
