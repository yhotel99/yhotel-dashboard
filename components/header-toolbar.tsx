"use client";

import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { BranchSelector } from "@/components/branch-selector";
import { CurrentBranchBadge } from "@/components/branch-form-field";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBranch } from "@/contexts/branch-context";
import { DASHBOARD_URLS } from "@/lib/constants";

function PaymentQrButton() {
  const router = useRouter();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => router.push(DASHBOARD_URLS.PAYMENT_QR)}
        >
          <QrCode className="size-4" />
          <span className="sr-only">Tạo mã QR thanh toán</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Tạo mã QR thanh toán</TooltipContent>
    </Tooltip>
  );
}

export function HeaderToolbar() {
  const { canSelectBranch } = useBranch();

  return (
    <div className="inline-flex items-center gap-2">
      <PaymentQrButton />
      {canSelectBranch ? (
        <BranchSelector />
      ) : (
        <CurrentBranchBadge className="font-normal" />
      )}
    </div>
  );
}
