"use client";

import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";
import {
  CHECKOUT_SESSION_STATUS,
  checkoutSessionStatusLabels,
} from "@/lib/constants";
import type { CheckoutSessionStatusValue } from "@/lib/types";

const statusConfig: Record<
  CheckoutSessionStatusValue,
  {
    label: string;
    variant: ComponentProps<typeof Badge>["variant"];
    className?: string;
  }
> = {
  pending: {
    label: checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.PENDING],
    variant: "outline",
    className:
      "border-blue-500 text-blue-600 dark:border-blue-500/70 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20",
  },
  expired: {
    label: checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.EXPIRED],
    variant: "outline",
    className:
      "border-orange-500 text-orange-600 dark:border-orange-500/70 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20",
  },
  completed: {
    label: checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.COMPLETED],
    variant: "outline",
    className:
      "border-green-500 text-green-600 dark:border-green-500/70 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
  },
  failed: {
    label: checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.FAILED],
    variant: "destructive",
  },
};

export function CheckoutSessionStatusBadge({
  status,
}: {
  status: string | null;
}) {
  if (!status) {
    return <span className="text-muted-foreground">-</span>;
  }

  const config = statusConfig[status as CheckoutSessionStatusValue];
  if (!config) {
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
