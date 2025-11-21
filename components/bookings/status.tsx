"use client";

import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";
import type { BookingStatus } from "@/lib/types";

const statusLabels: Record<BookingStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  checked_in: "Đã check-in",
  checked_out: "Đã check-out",
  cancelled: "Đã hủy",
};

const statusConfig: Record<
  BookingStatus,
  { variant: ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  pending: {
    variant: "outline",
    className: "border-amber-500 text-amber-600 dark:border-amber-500/70 dark:text-amber-400",
  },
  confirmed: {
    variant: "outline",
    className: "border-blue-500 text-blue-600 dark:border-blue-500/70 dark:text-blue-400",
  },
  checked_in: {
    variant: "outline",
    className: "border-green-500 text-green-600 dark:border-green-500/70 dark:text-green-400",
  },
  checked_out: {
    variant: "outline",
    className: "border-emerald-500 text-emerald-600 dark:border-emerald-500/70 dark:text-emerald-400",
  },
  cancelled: {
    variant: "destructive",
  },
};

export function StatusBadge({ status }: { status: BookingStatus | string }) {
  const config = statusConfig[status as BookingStatus] || {
    variant: "outline" as const,
    className: "border-muted-foreground/60 text-muted-foreground dark:border-muted-foreground/40",
  };

  const label =
    statusLabels[status as BookingStatus] || "Không xác định";

  return (
    <Badge variant={config.variant} className={config.className}>
      {label}
    </Badge>
  );
}

