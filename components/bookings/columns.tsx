"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BookingRecord, BookingStatus, BookingInput } from "@/lib/types";
import { BookingActionsCell } from "@/components/bookings/actions-cell";
import { StatusBadge } from "@/components/bookings/status";
import { NotesCell } from "@/components/bookings/notes-cell";

export function createColumns(
  updateStatus: (id: string, status: BookingStatus) => Promise<void>,
  handlers?: {
    onEdit?: (booking: BookingRecord) => void;
    onTransfer?: (id: string, input: BookingInput) => Promise<void>;
    onCancelBooking?: (id: string) => Promise<void>;
    pendingBooking?: (bookingId: string) => Promise<void>;
    confirmedBooking?: (bookingId: string) => Promise<void>;
    checkedInBooking?: (bookingId: string) => Promise<void>;
    checkedOutBooking?: (bookingId: string) => Promise<void>;
    cancelledBooking?: (bookingId: string) => Promise<void>;
  }
): ColumnDef<BookingRecord>[] {
  return [
    {
      accessorKey: "id",
      header: "Mã booking",
      cell: ({ row }) => row.original.id.slice(0, 8).toUpperCase(),
    },
    {
      accessorKey: "customers",
      header: "Khách hàng",
      cell: ({ row }) => row.original.customers?.full_name ?? "-",
    },
    {
      accessorKey: "customers.phone",
      header: "Số điện thoại",
      cell: ({ row }) => row.original.customers?.phone ?? "-",
    },
    {
      accessorKey: "rooms",
      header: "Số phòng",
      cell: ({ row }) => row.original.rooms?.name ?? "-",
    },
    {
      accessorKey: "check_in",
      header: "Check-in",
      cell: ({ row }) => formatDate(row.original.check_in),
    },
    {
      accessorKey: "check_out",
      header: "Check-out",
      cell: ({ row }) => formatDate(row.original.check_out),
    },
    {
      accessorKey: "number_of_nights",
      header: "Số đêm",
      cell: ({ row }) => `${row.original.number_of_nights} đêm`,
    },
    {
      accessorKey: "total_guests",
      header: "Số khách",
      cell: ({ row }) => `${row.original.total_guests} người`,
    },
    {
      accessorKey: "total_amount",
      header: "Tổng tiền",
      cell: ({ row }) => formatCurrency(row.original.total_amount),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "notes",
      header: "Ghi chú",
      cell: ({ row }) => <NotesCell notes={row.original.notes} />,
      size: 60,
      minSize: 40,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bookingId = row.original.id;
        const defaultCancelledBooking =
          handlers?.cancelledBooking ||
          (async (id: string) => await updateStatus(id, "cancelled"));

        const actionHandlers = {
          onEdit: handlers?.onEdit || (() => {}),
          onTransfer:
            handlers?.onTransfer ||
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (async (_id: string, _input: BookingInput) => {
              // Fallback: do nothing
            }),
          onCancelBooking:
            handlers?.onCancelBooking ||
            (async () => await defaultCancelledBooking(bookingId)),
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
    },
  ];
}
