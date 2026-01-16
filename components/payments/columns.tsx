"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import type { PaymentWithBooking } from "@/lib/types";
import { PaymentStatusBadge } from "./status";
import { PaymentDetailDialog } from "./detail-dialog";
import { paymentTypeLabels } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Column definitions constants
export const PAYMENTS_COLUMNS = {
  CUSTOMER_NAME: { accessorKey: "Khách hàng", header: "Khách hàng" },
  ROOM_NAME: { accessorKey: "Phòng", header: "Phòng" },
  AMOUNT: { accessorKey: "Số tiền", header: "Số tiền" },
  PAYMENT_TYPE: { accessorKey: "Loại thanh toán", header: "Loại thanh toán" },
  PAYMENT_STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  PAID_AT: { accessorKey: "Ngày thanh toán", header: "Ngày thanh toán" },
  CREATED_AT: { accessorKey: "Ngày tạo", header: "Ngày tạo" },
  ACTIONS: { accessorKey: "Hành động", header: "Hành động" },
} as const;

export function createPaymentsColumns(): ColumnDef<PaymentWithBooking>[] {
  return [
    {
      accessorKey: PAYMENTS_COLUMNS.CUSTOMER_NAME.accessorKey,
      header: PAYMENTS_COLUMNS.CUSTOMER_NAME.header,
      cell: ({ row }) => {
        const customerName = row.original.bookings?.customers?.full_name ?? "-";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[120px] truncate block font-medium">
                {customerName}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{customerName}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 140,
      minSize: 100,
      maxSize: 160,
    },
    {
      accessorKey: PAYMENTS_COLUMNS.ROOM_NAME.accessorKey,
      header: PAYMENTS_COLUMNS.ROOM_NAME.header,
      cell: ({ row }) => {
        const roomName = row.original.bookings?.rooms?.name ?? "-";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[160px] truncate block font-medium">
                {roomName}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{roomName}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 140,
      minSize: 100,
      maxSize: 140,
    },
    {
      accessorKey: PAYMENTS_COLUMNS.AMOUNT.accessorKey,
      header: PAYMENTS_COLUMNS.AMOUNT.header,
      cell: ({ row }) => formatCurrency(row.original.amount),
      size: 100,
      minSize: 100,
      maxSize: 120,
    },
    {
      accessorKey: PAYMENTS_COLUMNS.PAYMENT_TYPE.accessorKey,
      header: PAYMENTS_COLUMNS.PAYMENT_TYPE.header,
      cell: ({ row }) =>
        paymentTypeLabels[
          row.original.payment_type as keyof typeof paymentTypeLabels
        ] ?? row.original.payment_type,
      size: 100,
      minSize: 100,
      maxSize: 120,
    },
    {
      accessorKey: PAYMENTS_COLUMNS.PAYMENT_STATUS.accessorKey,
      header: PAYMENTS_COLUMNS.PAYMENT_STATUS.header,
      cell: ({ row }) => (
        <PaymentStatusBadge status={row.original.payment_status} />
      ),
      size: 130,
      minSize: 120,
    },
    {
      accessorKey: PAYMENTS_COLUMNS.PAID_AT.accessorKey,
      header: PAYMENTS_COLUMNS.PAID_AT.header,
      cell: ({ row }) =>
        row.original.paid_at ? formatDateOnly(row.original.paid_at) : "-",
      size: 120,
      minSize: 100,
      maxSize: 120,
    },
    {
      accessorKey: PAYMENTS_COLUMNS.CREATED_AT.accessorKey,
      header: PAYMENTS_COLUMNS.CREATED_AT.header,
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 100,
      minSize: 100,
      maxSize: 120,
    },
    {
      id: "actions",
      accessorKey: PAYMENTS_COLUMNS.ACTIONS.accessorKey,
      header: PAYMENTS_COLUMNS.ACTIONS.header,
      cell: ({ row }) => <PaymentDetailDialog payment={row.original} />,
      size: 60,
      minSize: 60,
      maxSize: 80,
    },
  ];
}
