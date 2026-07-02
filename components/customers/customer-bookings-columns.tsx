"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/bookings/status";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import type { BookingRecord } from "@/lib/types";

export const CUSTOMER_BOOKING_COLUMNS = {
  BOOKING_CODE: { accessorKey: "Mã booking", header: "Mã booking" },
  ROOM: { accessorKey: "Phòng", header: "Phòng" },
  BRANCH: { accessorKey: "Chi nhánh", header: "Chi nhánh" },
  CHECK_IN: { accessorKey: "Ngày check-in", header: "Check-in" },
  CHECK_OUT: { accessorKey: "Ngày check-out", header: "Check-out" },
  NUMBER_OF_NIGHTS: { accessorKey: "Số đêm", header: "Số đêm" },
  TOTAL_AMOUNT: { accessorKey: "Tổng tiền", header: "Tổng tiền" },
  ADVANCE_PAYMENT: { accessorKey: "Tiền đặt cọc", header: "Tiền cọc" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
} as const;

export function createCustomerBookingColumns(
  branchNameById: Readonly<Record<string, string>>
): ColumnDef<BookingRecord>[] {
  return [
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.BOOKING_CODE.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.BOOKING_CODE.header,
      cell: ({ row }) => {
        const bookingCode =
          row.original.booking_code ||
          row.original.id.slice(0, 8).toUpperCase();
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[140px] truncate font-semibold text-primary cursor-default">
                {bookingCode}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{bookingCode}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.ROOM.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.ROOM.header,
      cell: ({ row }) => {
        const roomName = row.original.rooms?.name ?? "-";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] truncate font-medium">
                {roomName}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{roomName}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.BRANCH.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.BRANCH.header,
      cell: ({ row }) => {
        const branchId = row.original.branch_id;
        const label =
          branchId && branchNameById[branchId]
            ? branchNameById[branchId]
            : "—";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[140px] truncate font-medium">{label}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.CHECK_IN.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.CHECK_IN.header,
      cell: ({ row }) => formatDateOnly(row.original.check_in),
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.CHECK_OUT.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.CHECK_OUT.header,
      cell: ({ row }) => formatDateOnly(row.original.check_out),
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.NUMBER_OF_NIGHTS.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.NUMBER_OF_NIGHTS.header,
      cell: ({ row }) => `${row.original.number_of_nights} đêm`,
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.TOTAL_AMOUNT.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.TOTAL_AMOUNT.header,
      cell: ({ row }) =>
        formatCurrency(row.original.final_amount ?? row.original.total_amount),
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.ADVANCE_PAYMENT.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.ADVANCE_PAYMENT.header,
      cell: ({ row }) => formatCurrency(row.original.advance_payment || 0),
    },
    {
      accessorKey: CUSTOMER_BOOKING_COLUMNS.STATUS.accessorKey,
      header: CUSTOMER_BOOKING_COLUMNS.STATUS.header,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}
