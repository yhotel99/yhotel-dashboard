import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";
import { PAYMENT_STATUS, paymentStatusLabels } from "@/lib/constants";

export const statusStyle: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  [PAYMENT_STATUS.PENDING]: {
    label: paymentStatusLabels[PAYMENT_STATUS.PENDING],
    className: "text-amber-600 dark:text-amber-400",
  },
  [PAYMENT_STATUS.PAID]: {
    label: paymentStatusLabels[PAYMENT_STATUS.PAID],
    className: "text-green-600 dark:text-green-400",
  },
  [PAYMENT_STATUS.FAILED]: {
    label: paymentStatusLabels[PAYMENT_STATUS.FAILED],
    className: "text-red-600 dark:text-red-400",
  },
  [PAYMENT_STATUS.REFUNDED]: {
    label: paymentStatusLabels[PAYMENT_STATUS.REFUNDED],
    className: "text-purple-600 dark:text-purple-400",
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusStyle[status];
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}

