"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import type {
  RefundRequestStatus,
  RefundRequest,
  RefundRequestWithRelations,
} from "@/lib/types";
import { RefundRequestActionsCell } from "./actions-cell";
import { RefundRequestStatusBadge } from "./status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";
import { toast } from "sonner";

// Column definitions constants
export const REFUND_COLUMNS = {
  REQUEST_ID: { accessorKey: "Mã yêu cầu", header: "Mã yêu cầu" },
  CUSTOMER_NAME: { accessorKey: "Khách hàng", header: "Khách hàng" },
  ROOM_NAME: { accessorKey: "Phòng", header: "Phòng" },
  AMOUNT: { accessorKey: "Số tiền", header: "Số tiền" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  CREATED_AT: { accessorKey: "Ngày tạo", header: "Ngày tạo" },
  REQUEST_BY: { accessorKey: "Người yêu cầu", header: "Người yêu cầu" },
} as const;

export function createRefundRequestColumns(
  onStatusChange: () => void,
  updateRefundRequestStatus: (
    id: string,
    status: RefundRequestStatus
  ) => Promise<RefundRequest>,
  onViewDetail: (refundRequest: RefundRequestWithRelations) => void
): ColumnDef<RefundRequestWithRelations>[] {
  return [
    {
      accessorKey: REFUND_COLUMNS.REQUEST_ID.accessorKey,
      header: REFUND_COLUMNS.REQUEST_ID.header,
      cell: ({ row }) => {
        const id = row.original.id;
        const handleCopy = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(id);
          toast.success("Đã sao chép mã yêu cầu!");
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center justify-between gap-1.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                onClick={handleCopy}
              >
                <span className="font-mono text-sm truncate uppercase">
                  {id}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                <p className="font-mono text-xs">{id}</p>
                <p className="text-[10px] text-muted-foreground">
                  Click để sao chép
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 140,
      minSize: 100,
    },
    {
      accessorKey: REFUND_COLUMNS.CUSTOMER_NAME.accessorKey,
      header: REFUND_COLUMNS.CUSTOMER_NAME.header,
      cell: ({ row }) => row.original.bookings?.customers?.full_name ?? "-",
      size: 140,
      minSize: 120,
    },
    {
      accessorKey: REFUND_COLUMNS.ROOM_NAME.accessorKey,
      header: REFUND_COLUMNS.ROOM_NAME.header,
      cell: ({ row }) => row.original.bookings?.rooms?.name ?? "-",
      size: 140,
      minSize: 120,
      maxSize: 140,
    },
    {
      accessorKey: REFUND_COLUMNS.AMOUNT.accessorKey,
      header: REFUND_COLUMNS.AMOUNT.header,
      cell: ({ row }) => formatCurrency(row.original.amount),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: REFUND_COLUMNS.STATUS.accessorKey,
      header: REFUND_COLUMNS.STATUS.header,
      cell: ({ row }) => (
        <RefundRequestStatusBadge status={row.original.status} />
      ),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: REFUND_COLUMNS.CREATED_AT.accessorKey,
      header: REFUND_COLUMNS.CREATED_AT.header,
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: REFUND_COLUMNS.REQUEST_BY.accessorKey,
      header: REFUND_COLUMNS.REQUEST_BY.header,
      cell: ({ row }) =>
        row.original.request_by_profile?.full_name || (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.request_by.slice(0, 8).toUpperCase()}
          </span>
        ),
      size: 150,
      minSize: 120,
      enableHiding: true,
    },
    {
      id: "actions",
      accessorKey: "Hành động",
      header: "Hành động",
      cell: ({ row }) => (
        <RefundRequestActionsCell
          refundRequest={row.original}
          onStatusChange={onStatusChange}
          updateRefundRequestStatus={updateRefundRequestStatus}
          onViewDetail={onViewDetail}
        />
      ),
      size: 110,
      minSize: 110,
      maxSize: 120,
      enableHiding: false,
    },
  ];
}
