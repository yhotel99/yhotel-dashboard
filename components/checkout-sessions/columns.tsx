"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  formatCheckoutSessionRoomsLabel,
  formatCurrency,
  formatDate,
  formatDateOnly,
} from "@/lib/functions";
import type { CheckoutSessionRecord } from "@/lib/types";
import { SIDEBAR_URLS } from "@/lib/constants";
import { PaymentLogStatusBadge } from "@/components/payment-logs/status";
import { CheckoutSessionStatusBadge } from "./status";
import { CheckoutSessionActionsCell } from "./actions-cell";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const CHECKOUT_SESSION_COLUMNS = {
  PAYMENT_CODE: { accessorKey: "Mã thanh toán", header: "Mã thanh toán" },
  GUEST: { accessorKey: "Khách hàng", header: "Khách hàng" },
  PHONE: { accessorKey: "Số điện thoại", header: "SĐT" },
  ROOMS: { accessorKey: "Phòng", header: "Phòng" },
  CHECK_IN: { accessorKey: "Check-in", header: "Check-in" },
  CHECK_OUT: { accessorKey: "Check-out", header: "Check-out" },
  AMOUNT: { accessorKey: "Số tiền", header: "Số tiền" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  EXPIRES_AT: { accessorKey: "Hết hạn", header: "Hết hạn" },
  BOOKING: { accessorKey: "Booking", header: "Booking" },
  WEBHOOK: { accessorKey: "Webhook", header: "Webhook" },
  ACTIONS: { accessorKey: "Thao tác", header: "Thao tác" },
} as const;

export function createCheckoutSessionColumns(options?: {
  onCreated?: () => void;
  roomNumberById?: Readonly<Record<string, string>>;
}): ColumnDef<CheckoutSessionRecord>[] {
  const roomNumberById = options?.roomNumberById;
  return [
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.PAYMENT_CODE.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.PAYMENT_CODE.header,
      cell: ({ row }) => {
        const code = row.original.payment_code;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[140px] truncate block font-semibold">
                {code}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs break-all">{code}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 140,
      minSize: 100,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.GUEST.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.GUEST.header,
      cell: ({ row }) => row.original.guest_name || "-",
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.PHONE.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.PHONE.header,
      cell: ({ row }) => row.original.guest_phone || "-",
      size: 120,
      minSize: 90,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.ROOMS.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.ROOMS.header,
      cell: ({ row }) => {
        const label = formatCheckoutSessionRoomsLabel(
          row.original.rooms,
          roomNumberById
        );
        const tooltip = formatCheckoutSessionRoomsLabel(
          row.original.rooms,
          roomNumberById,
          { includeAmount: true }
        );
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[220px] truncate block">{label}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs whitespace-pre-wrap">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 200,
      minSize: 140,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.CHECK_IN.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.CHECK_IN.header,
      cell: ({ row }) => formatDateOnly(row.original.check_in),
      size: 110,
      minSize: 90,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.CHECK_OUT.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.CHECK_OUT.header,
      cell: ({ row }) => formatDateOnly(row.original.check_out),
      size: 110,
      minSize: 90,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.AMOUNT.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.AMOUNT.header,
      cell: ({ row }) => formatCurrency(row.original.final_amount),
      size: 120,
      minSize: 90,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.STATUS.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.STATUS.header,
      cell: ({ row }) => (
        <CheckoutSessionStatusBadge status={row.original.status} />
      ),
      size: 130,
      minSize: 100,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.EXPIRES_AT.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.EXPIRES_AT.header,
      cell: ({ row }) => formatDate(row.original.expires_at),
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.BOOKING.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.BOOKING.header,
      cell: ({ row }) => {
        if (!row.original.booking_id) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <Link
            href={`${SIDEBAR_URLS.BOOKINGS}?search=${encodeURIComponent(row.original.payment_code)}`}
            className="text-primary font-medium hover:underline"
          >
            {row.original.payment_code}
          </Link>
        );
      },
      size: 140,
      minSize: 100,
    },
    {
      accessorKey: CHECKOUT_SESSION_COLUMNS.WEBHOOK.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.WEBHOOK.header,
      cell: ({ row }) => (
        <PaymentLogStatusBadge status={row.original.payment_log_status} />
      ),
      size: 120,
      minSize: 90,
    },
    {
      id: CHECKOUT_SESSION_COLUMNS.ACTIONS.accessorKey,
      header: CHECKOUT_SESSION_COLUMNS.ACTIONS.header,
      cell: ({ row }) => (
        <CheckoutSessionActionsCell
          session={row.original}
          roomNumberById={roomNumberById}
          onCreated={options?.onCreated}
        />
      ),
      size: 130,
      minSize: 110,
      enableHiding: false,
    },
  ];
}
