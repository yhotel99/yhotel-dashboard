import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/types";

const statusConfig: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: {
    label: "Chờ thanh toán",
    variant: "outline",
  },
  paid: {
    label: "Đã thanh toán",
    variant: "default",
  },
  failed: {
    label: "Thất bại",
    variant: "destructive",
  },
  refunded: {
    label: "Đã hoàn tiền",
    variant: "secondary",
  },
  cancelled: {
    label: "Đã hủy",
    variant: "outline",
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} className="whitespace-nowrap">
      {config.label}
    </Badge>
  );
}

