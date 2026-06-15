"use client";

import { useMemo, useState } from "react";
import { useVndAmountInput } from "@/hooks/use-vnd-amount-input";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bankMissingMessage } from "@/lib/bank-info";
import { formatCurrency } from "@/lib/functions";
import { buildSepayQrImageUrl, normalizePaymentDescription } from "@/lib/payment-qr";
import { PaymentQrImage } from "@/components/payment-qr-image";
import { useBranchBankAccounts } from "@/hooks/use-branch-bank-accounts";
import { useBranch } from "@/contexts/branch-context";
import { DASHBOARD_URLS } from "@/lib/constants";
import Link from "next/link";
import { cn } from "@/lib/utils";

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function PaymentQrGenerator() {
  const { branches, filterBranchId, selectedBranchId } = useBranch();
  const { getBankInfo, getBranchBankAccount, isLoading: isBankLoading } =
    useBranchBankAccounts();
  const { amount, inputProps: amountInputProps } = useVndAmountInput();
  const [description, setDescription] = useState("");
  const [branchId, setBranchId] = useState<string>(
    () => filterBranchId ?? selectedBranchId ?? branches[0]?.id ?? ""
  );

  const activeBranchId =
    branchId || filterBranchId || selectedBranchId || branches[0]?.id;

  const branchAccount = useMemo(
    () => (activeBranchId ? getBranchBankAccount(activeBranchId) : undefined),
    [activeBranchId, getBranchBankAccount]
  );

  const bankInfo = useMemo(
    () => (activeBranchId ? getBankInfo(activeBranchId) : null),
    [activeBranchId, getBankInfo]
  );

  const paymentDescription = useMemo(
    () => normalizePaymentDescription(description),
    [description]
  );
  const canShowQr =
    bankInfo != null && amount > 0 && paymentDescription.length > 0;

  const qrImageUrl = useMemo(() => {
    if (!canShowQr || !bankInfo) return null;
    return buildSepayQrImageUrl({
      acc: bankInfo.acc,
      bank: bankInfo.bank,
      amount,
      description: paymentDescription,
    });
  }, [amount, bankInfo, canShowQr, paymentDescription]);

  const handleCopyDescription = async () => {
    if (!paymentDescription) return;
    try {
      await navigator.clipboard.writeText(paymentDescription);
      toast.success("Đã sao chép nội dung chuyển khoản");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const missingMessage = branchAccount
    ? bankMissingMessage(branchAccount.branch_name)
    : bankMissingMessage();

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid lg:grid-cols-5">
        <section className="lg:col-span-2 p-6 md:p-8 space-y-6 border-b lg:border-b-0 lg:border-r">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bước 1
            </p>
            <h2 className="text-lg font-semibold tracking-tight">
              Nhập thông tin
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-qr-branch">Chi nhánh</Label>
              <Select
                value={activeBranchId}
                onValueChange={setBranchId}
                disabled={branches.length === 0}
              >
                <SelectTrigger id="payment-qr-branch" className="h-11 w-full">
                  <SelectValue placeholder="Chọn chi nhánh" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-qr-amount">Số tiền (VND)</Label>
              <Input
                id="payment-qr-amount"
                placeholder="1.500.000"
                {...amountInputProps}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-qr-description">Nội dung chuyển khoản</Label>
              <Textarea
                id="payment-qr-description"
                placeholder="YH-20260315-001"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {isBankLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải cài đặt ngân hàng...</p>
          ) : !bankInfo ? (
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
              {missingMessage}{" "}
              <Link
                href={DASHBOARD_URLS.SETTINGS}
                className="font-medium underline underline-offset-2"
              >
                Mở Cài đặt
              </Link>
            </p>
          ) : canShowQr ? (
            <div className="rounded-xl bg-muted/50 px-4 py-1">
              <SummaryRow label="Ngân hàng" value={bankInfo.bankLabel} />
              <SummaryRow
                label="Số tài khoản"
                value={<span className="font-mono">{bankInfo.acc}</span>}
              />
              <SummaryRow label="Chủ tài khoản" value={bankInfo.accountName} />
              <SummaryRow
                label="Số tiền"
                value={formatCurrency(amount)}
                valueClassName="text-emerald-600 dark:text-emerald-400 font-semibold"
              />
              <div className="flex items-start justify-between gap-4 py-2.5">
                <span className="text-sm text-muted-foreground shrink-0">
                  Nội dung
                </span>
                <div className="flex items-start gap-1 min-w-0">
                  <span className="text-sm font-mono font-medium text-right break-all">
                    {paymentDescription}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 -mr-1"
                    onClick={handleCopyDescription}
                    title="Sao chép"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : bankInfo ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Điền số tiền và nội dung để xem mã QR và thông tin chuyển khoản.
            </p>
          ) : null}
        </section>

        <section className="lg:col-span-3 flex flex-col items-center justify-center p-6 md:p-10 bg-muted/20 min-h-[320px] lg:min-h-[440px]">
          <div className="space-y-1 text-center mb-6 w-full">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bước 2
            </p>
            <h2 className="text-lg font-semibold tracking-tight">
              Mã QR thanh toán
            </h2>
          </div>

          {isBankLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : !bankInfo ? (
            <p className="text-sm text-center text-muted-foreground max-w-xs leading-relaxed">
              Cần cấu hình thông tin ngân hàng cho chi nhánh trong Cài đặt trước khi tạo mã QR.
            </p>
          ) : qrImageUrl ? (
            <div className="flex flex-col items-center gap-5 w-full max-w-sm">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <PaymentQrImage
                  src={qrImageUrl}
                  width={256}
                  height={256}
                  className="size-64"
                  unoptimized
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Quét mã để chuyển khoản
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-4 max-w-xs">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/50">
                <QrCode className="size-9 opacity-40" strokeWidth={1.5} />
              </div>
              <p className="text-sm leading-relaxed">
                Mã QR xuất hiện ngay khi bạn nhập đủ số tiền và nội dung bên
                trái.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
