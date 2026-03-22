"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  formatCurrency,
  formatDateOnly,
  formatRoomNumbersWithTypeNameFallback,
} from "@/lib/functions";
import type { PaymentMethod, PaymentWithBooking } from "@/lib/types";
import { PaymentStatusBadge } from "./status";
import { PaymentDetailDialog } from "./detail-dialog";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Column definitions constants
export const PAYMENTS_COLUMNS = {
  CUSTOMER_NAME: { accessorKey: "Khách hàng", header: "Khách hàng" },
  ROOM_NAME: { accessorKey: "Số phòng", header: "Số phòng" },
  AMOUNT: { accessorKey: "Số tiền", header: "Số tiền" },
  PAYMENT_TYPE: { accessorKey: "Loại thanh toán", header: "Loại thanh toán" },
  PAYMENT_METHOD: { accessorKey: "Phương thức thanh toán", header: "Phương thức thanh toán" },
  PAYMENT_STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  PAID_AT: { accessorKey: "Ngày thanh toán", header: "Ngày thanh toán" },
  CREATED_AT: { accessorKey: "Ngày tạo", header: "Ngày tạo" },
  ACTIONS: { accessorKey: "Hành động", header: "" },
} as const;

export function createPaymentsColumns(options?: {
  roomNumberById?: Readonly<Record<string, string>>;
}): ColumnDef<PaymentWithBooking>[] {
  const roomNumberById = options?.roomNumberById;
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
        const label = formatRoomNumbersWithTypeNameFallback(
          {
            room_id: null,
            rooms: row.original.bookings?.rooms ?? undefined,
            booking_rooms: undefined,
          },
          roomNumberById
        );
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[200px] truncate block font-medium">
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
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
      accessorKey: PAYMENTS_COLUMNS.PAYMENT_METHOD.accessorKey,
      header: PAYMENTS_COLUMNS.PAYMENT_METHOD.header,
      cell: ({ row }) => <Badge
        variant="outline"
        className="bg-primary/10 text-primary border-primary/20"
      >
        {paymentMethodLabels[row.original.payment_method as PaymentMethod] ||
          row.original.payment_method}
      </Badge>,
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
