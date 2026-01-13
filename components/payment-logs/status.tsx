import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";
import type { PaymentLogStatus } from "@/lib/types";

const statusConfig: Record<
  PaymentLogStatus,
  {
    label: string;
    variant: ComponentProps<typeof Badge>["variant"];
    className?: string;
  }
> = {
  processing: {
    label: "Đang xử lý",
    variant: "outline",
    className:
      "border-blue-500 text-blue-600 dark:border-blue-500/70 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20",
  },
  success: {
    label: "Thành công",
    variant: "outline",
    className:
      "border-green-500 text-green-600 dark:border-green-500/70 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
  },
  skipped: {
    label: "Đã bỏ qua",
    variant: "outline",
    className:
      "border-gray-500 text-gray-600 dark:border-gray-400/70 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20",
  },
  error: {
    label: "Lỗi",
    variant: "destructive",
  },
  underpaid: {
    label: "Thiếu tiền",
    variant: "outline",
    className:
      "border-orange-500 text-orange-600 dark:border-orange-500/70 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20",
  },
};

export function PaymentLogStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-muted-foreground">-</span>;
  }

  const normalizedStatus = status.toLowerCase() as PaymentLogStatus;
  const config = statusConfig[normalizedStatus];

  if (!config) {
    // Fallback for unknown status
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        {status}
      </Badge>
    );
  }

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
