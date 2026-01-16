"use client";

import { Badge } from "@/components/ui/badge";
import type { RefundRequestStatus } from "@/lib/types";
import {
  REFUND_REQUEST_STATUS,
  refundRequestStatusLabels,
} from "@/lib/constants";

// Status colors for refund request statuses
const refundRequestStatusColors: Record<RefundRequestStatus, string> = {
  [REFUND_REQUEST_STATUS.PENDING]:
    "bg-yellow-100 text-yellow-800 border-yellow-300",
  [REFUND_REQUEST_STATUS.APPROVED]: "bg-blue-100 text-blue-800 border-blue-300",
  [REFUND_REQUEST_STATUS.REJECTED]: "bg-red-100 text-red-800 border-red-300",
  [REFUND_REQUEST_STATUS.REFUNDED]:
    "bg-green-100 text-green-800 border-green-300",
};

export function RefundRequestStatusBadge({
  status,
}: {
  status: RefundRequestStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={`${refundRequestStatusColors[status]} border`}
    >
      {refundRequestStatusLabels[status]}
    </Badge>
  );
}
