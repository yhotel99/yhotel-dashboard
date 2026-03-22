"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  formatCurrency,
  formatDateOnly,
  formatDate,
  formatRoomNumbersWithTypeNameFallback,
} from "@/lib/functions";
import type { PaymentLogWithBooking } from "@/lib/types";
import { PaymentLogStatusBadge } from "./status";
import { PaymentLogDetailDialog } from "./detail-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Column definitions constants
export const PAYMENT_LOG_COLUMNS = {
  BOOKING_CODE: { accessorKey: "Mã Booking", header: "Mã Booking" },
  TRANSACTION_ID: { accessorKey: "Mã Giao Dịch", header: "Mã Giao Dịch" },
  CUSTOMER_NAME: { accessorKey: "Khách hàng", header: "Khách hàng" },
  ROOM_NAME: { accessorKey: "Số phòng", header: "Số phòng" },
  AMOUNT: { accessorKey: "Số tiền", header: "Số tiền" },
  BANK_CODE: { accessorKey: "Ngân hàng", header: "Ngân hàng" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  CONTENT: { accessorKey: "Nội dung", header: "Nội dung" },
  PROCESSED_AT: { accessorKey: "Thời gian xử lý", header: "Thời gian xử lý" },
  CREATED_AT: { accessorKey: "Ngày tạo", header: "Ngày tạo" },
} as const;

export function createPaymentLogColumns(options?: {
  roomNumberById?: Readonly<Record<string, string>>;
}): ColumnDef<PaymentLogWithBooking>[] {
  const roomNumberById = options?.roomNumberById;
  return [
    {
      accessorKey: PAYMENT_LOG_COLUMNS.BOOKING_CODE.accessorKey,
      header: PAYMENT_LOG_COLUMNS.BOOKING_CODE.header,
      cell: ({ row }) => {
        const bookingCode = row.original.booking_code;
        if (!bookingCode) return "-";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[140px] truncate block font-semibold">
                {bookingCode}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs break-all">{bookingCode}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 140,
      minSize: 100,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.TRANSACTION_ID.accessorKey,
      header: PAYMENT_LOG_COLUMNS.TRANSACTION_ID.header,
      cell: ({ row }) => {
        const transactionId = row.original.transaction_id;
        if (!transactionId) return "-";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[120px] truncate block font-semibold">
                {transactionId}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs break-all">{transactionId}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.CUSTOMER_NAME.accessorKey,
      header: PAYMENT_LOG_COLUMNS.CUSTOMER_NAME.header,
      cell: ({ row }) => row.original.bookings?.customers?.full_name ?? "-",
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.ROOM_NAME.accessorKey,
      header: PAYMENT_LOG_COLUMNS.ROOM_NAME.header,
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
      size: 120,
      minSize: 80,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.AMOUNT.accessorKey,
      header: PAYMENT_LOG_COLUMNS.AMOUNT.header,
      cell: ({ row }) =>
        row.original.amount ? formatCurrency(row.original.amount) : "-",
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.BANK_CODE.accessorKey,
      header: PAYMENT_LOG_COLUMNS.BANK_CODE.header,
      cell: ({ row }) => row.original.bank_code || "-",
      size: 100,
      minSize: 80,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.STATUS.accessorKey,
      header: PAYMENT_LOG_COLUMNS.STATUS.header,
      cell: ({ row }) => {
        return <PaymentLogStatusBadge status={row.original.status} />;
      },
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.CONTENT.accessorKey,
      header: PAYMENT_LOG_COLUMNS.CONTENT.header,
      cell: ({ row }) => {
        const content = row.original.content;
        if (!content) return "-";
        return (
          <span className="max-w-[200px] truncate block" title={content}>
            {content}
          </span>
        );
      },
      size: 200,
      minSize: 150,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.PROCESSED_AT.accessorKey,
      header: PAYMENT_LOG_COLUMNS.PROCESSED_AT.header,
      cell: ({ row }) => {
        const processedAt = row.original.processed_at;
        if (!processedAt) {
          return (
            <span className="text-muted-foreground text-sm italic">
              Chưa xử lý
            </span>
          );
        }

        const formattedDate = formatDate(processedAt);
        return (
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">
              {formattedDate}
            </span>
          </div>
        );
      },
      size: 180,
      minSize: 150,
    },
    {
      accessorKey: PAYMENT_LOG_COLUMNS.CREATED_AT.accessorKey,
      header: PAYMENT_LOG_COLUMNS.CREATED_AT.header,
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 150,
      minSize: 130,
    },
    {
      id: "actions",
      accessorKey: "Hành động",
      header: "Hành động",
      cell: ({ row }) => {
        const log = row.original;
        return (
          <PaymentLogDetailDialog
            paymentLog={log}
            roomNumberById={roomNumberById}
          />
        );
      },
      size: 100,
      minSize: 80,
    },
  ];
}
