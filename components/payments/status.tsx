import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/types";
import type { ComponentProps } from "react";

const statusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: ComponentProps<typeof Badge>["variant"];
    className?: string;
  }
> = {
  pending: {
    label: "Chờ thanh toán",
    variant: "outline",
    className:
      "border-amber-500 text-amber-600 dark:border-amber-500/70 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20",
  },
  paid: {
    label: "Đã thanh toán",
    variant: "outline",
    className:
      "border-green-500 text-green-600 dark:border-green-500/70 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
  },
  failed: {
    label: "Thất bại",
    variant: "destructive",
  },
  refunded: {
    label: "Đã hoàn tiền",
    variant: "outline",
    className:
      "border-blue-500 text-blue-600 dark:border-blue-500/70 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20",
  },
  cancelled: {
    label: "Đã hủy",
    variant: "outline",
    className:
      "border-gray-500 text-gray-600 dark:border-gray-400/70 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20",
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge
      variant={config.variant}
      className={
        config.className
          ? `${config.className} whitespace-nowrap`
          : "whitespace-nowrap"
      }
    >
      {config.label}
    </Badge>
  );
}
