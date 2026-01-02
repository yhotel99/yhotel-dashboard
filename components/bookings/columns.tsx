"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import type {
  BookingRecord,
  BookingStatus,
  TransferBookingInput,
} from "@/lib/types";
import { BookingActionsCell } from "@/components/bookings/actions-cell";
import { StatusBadge } from "@/components/bookings/status";
import { NotesCell } from "@/components/bookings/notes-cell";

export function createColumns(
  updateStatus: (id: string, status: BookingStatus) => Promise<void>,
  handlers?: {
    onEdit?: (booking: BookingRecord) => void;
    onTransfer?: (id: string, input: TransferBookingInput) => Promise<void>;
    onMarkAdvancePayment?: (bookingId: string) => Promise<void>;
    onCancelBooking?: (id: string) => Promise<void>;
    checkAdvancePaymentStatus?: (bookingId: string) => Promise<{
      hasAdvancePayment: boolean;
      isPaid: boolean;
      paymentId: string | null;
    }>;
    pendingBooking?: (bookingId: string) => Promise<void>;
    confirmedBooking?: (bookingCode: string) => Promise<void>;
    checkedInBooking?: (bookingId: string) => Promise<void>;
    checkedOutBooking?: (bookingId: string) => Promise<void>;
    cancelledBooking?: (bookingId: string) => Promise<void>;
  }
): ColumnDef<BookingRecord>[] {
  return [
    {
      accessorKey: "Mã booking",
      header: "Mã booking",
      cell: ({ row }) => (
        <div className="font-semibold text-primary">
          {row.original.booking_code}
        </div>
      ),
    },
    {
      accessorKey: "Tên khách hàng",
      header: "Khách hàng",
      cell: ({ row }) => row.original.customers?.full_name ?? "-",
    },
    {
      accessorKey: "Số phòng",
      header: "Số phòng",
      cell: ({ row }) => row.original.rooms?.name ?? "-",
    },
    {
      accessorKey: "Ngày check-in",
      header: "Check-in",
      cell: ({ row }) => formatDateOnly(row.original.check_in),
    },
    {
      accessorKey: "Ngày check-out",
      header: "Check-out",
      cell: ({ row }) => formatDateOnly(row.original.check_out),
    },
    {
      accessorKey: "Số đêm",
      header: "Số đêm",
      cell: ({ row }) => `${row.original.number_of_nights} đêm`,
    },
    {
      accessorKey: "Số khách",
      header: "Số khách",
      cell: ({ row }) => `${row.original.total_guests} người`,
    },
    {
      accessorKey: "Tổng tiền",
      header: "Tổng tiền",
      cell: ({ row }) => formatCurrency(row.original.total_amount),
    },
    {
      accessorKey: "Tiền đặt cọc",
      header: "Tiền đặt cọc",
      cell: ({ row }) => formatCurrency(row.original.advance_payment),
    },
    {
      accessorKey: "Trạng thái",
      header: "Trạng thái",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "Ghi chú",
      header: "Ghi chú",
      cell: ({ row }) => <NotesCell notes={row.original.notes} />,
    },
    {
      id: "Hành động",
      cell: ({ row }) => {
        const defaultCancelledBooking =
          handlers?.cancelledBooking ||
          (async (id: string) => await updateStatus(id, "cancelled"));

        const actionHandlers = {
          onEdit: handlers?.onEdit || (() => {}),
          onTransfer:
            handlers?.onTransfer ||
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (async (_id: string, _input: TransferBookingInput) => {
              // Fallback: do nothing
            }),
          onMarkAdvancePayment:
            handlers?.onMarkAdvancePayment ||
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (async (_bookingId: string) => {
              // Fallback: do nothing
            }),
          onCancelBooking: handlers?.onCancelBooking || defaultCancelledBooking,
          checkAdvancePaymentStatus: handlers?.checkAdvancePaymentStatus,
          pendingBooking:
            handlers?.pendingBooking ||
            (async (id: string) => await updateStatus(id, "pending")),
          confirmedBooking:
            handlers?.confirmedBooking ||
            (async (id: string) => await updateStatus(id, "confirmed")),
          checkedInBooking:
            handlers?.checkedInBooking ||
            (async (id: string) => await updateStatus(id, "checked_in")),
          checkedOutBooking:
            handlers?.checkedOutBooking ||
            (async (id: string) => await updateStatus(id, "checked_out")),
          cancelledBooking: defaultCancelledBooking,
        };

        return (
          <BookingActionsCell
            booking={row.original}
            customerId={row.original.customer_id}
            {...actionHandlers}
          />
        );
      },
      size: 80,
      minSize: 40,
      maxSize: 100,
    },
  ];
}
