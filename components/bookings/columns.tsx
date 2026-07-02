"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  formatBookingRoomNumbersLabel,
  formatCurrency,
  formatDateOnly,
} from "@/lib/functions";
import type {
  BookingRecord,
  BookingStatus,
  ConfirmBookingEmailOptions,
} from "@/lib/types";
import { BookingActionsCell } from "@/components/bookings/actions-cell";
import type { CancelBookingConfirmOptions } from "@/components/bookings/cancel-booking-confirm-dialog";
import { StatusBadge } from "@/components/bookings/status";
import { NotesCell } from "@/components/bookings/notes-cell";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

// Column definitions constants
export const COLUMNS = {
  BOOKING_CODE: { accessorKey: "Mã booking", header: "Mã booking" },
  CUSTOMER_NAME: { accessorKey: "Khách hàng", header: "Khách hàng" },
  ROOM_NAME: { accessorKey: "Số phòng", header: "Số phòng" },
  CHECK_IN: { accessorKey: "Ngày check-in", header: "Check-in" },
  CHECK_OUT: { accessorKey: "Ngày check-out", header: "Check-out" },
  NUMBER_OF_NIGHTS: { accessorKey: "Số đêm", header: "Số đêm" },
  TOTAL_GUESTS: { accessorKey: "Số khách", header: "Số khách" },
  TOTAL_AMOUNT: { accessorKey: "Tổng tiền", header: "Tổng tiền" },
  ADVANCE_PAYMENT: { accessorKey: "Tiền đặt cọc", header: "Tiền đặt cọc" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  NOTES: { accessorKey: "Ghi chú", header: "Ghi chú" },
  BRANCH: { accessorKey: "Chi nhánh", header: "Chi nhánh" },
} as const;

export function createColumns(
  updateStatus: (id: string, status: BookingStatus) => Promise<void>,
  handlers?: {
    onEdit?: (booking: BookingRecord) => void;
    onMarkAdvancePayment?: (bookingId: string) => Promise<void>;
    onCancelBooking?: (
      id: string,
      options?: CancelBookingConfirmOptions
    ) => Promise<void>;
    checkAdvancePaymentStatus?: (bookingId: string) => Promise<{
      hasAdvancePayment: boolean;
      isPaid: boolean;
      paymentId: string | null;
    }>;
    pendingBooking?: (bookingId: string) => Promise<void>;
    confirmedBooking?: (
      bookingCode: string,
      options?: ConfirmBookingEmailOptions
    ) => Promise<void>;
    checkedInBooking?: (bookingId: string) => Promise<void>;
    checkedOutBooking?: (bookingId: string) => Promise<void>;
    cancelledBooking?: (
      bookingId: string,
      options?: CancelBookingConfirmOptions
    ) => Promise<void>;
  },
  options?: {
    /** id phòng → số phòng (bảng rooms, cùng nguồn /dashboard/rooms) */
    roomNumberById?: Readonly<Record<string, string>>;
    /** id chi nhánh → tên (cột ẩn mặc định, bật qua "Cột hiển thị") */
    branchNameById?: Readonly<Record<string, string>>;
  }
): ColumnDef<BookingRecord>[] {
  const roomNumberById = options?.roomNumberById;
  const branchNameById = options?.branchNameById;
  return [
    {
      accessorKey: COLUMNS.BOOKING_CODE.accessorKey,
      header: COLUMNS.BOOKING_CODE.header,
      cell: ({ row }) => {
        const bookingCode = row.original.booking_code;
        const handleCopy = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(bookingCode);
          toast.success("Đã sao chép mã booking!");
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleCopy}
              >
                <span className="font-semibold text-primary">
                  {bookingCode}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                <p>{bookingCode}</p>
                <p className="text-[10px] text-muted-foreground">
                  Click để sao chép
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: COLUMNS.CUSTOMER_NAME.accessorKey,
      header: COLUMNS.CUSTOMER_NAME.header,
      cell: ({ row }) => {
        const fullName = row.original.customers?.full_name ?? "-"
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[160px] truncate font-medium">
                {fullName}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{fullName}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 100,
      minSize: 100,
      maxSize: 140,
    },
    {
      accessorKey: COLUMNS.ROOM_NAME.accessorKey,
      header: COLUMNS.ROOM_NAME.header,
      cell: ({ row }) => {
        const label = formatBookingRoomNumbersLabel(
          row.original,
          roomNumberById
        );
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] truncate font-medium">
                {label}
              </div>
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
      accessorKey: COLUMNS.BRANCH.accessorKey,
      header: COLUMNS.BRANCH.header,
      cell: ({ row }) => {
        const branchId = row.original.branch_id;
        const label =
          branchId && branchNameById
            ? branchNameById[branchId] ?? "—"
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
      size: 120,
      minSize: 100,
      maxSize: 160,
    },
    {
      accessorKey: COLUMNS.CHECK_IN.accessorKey,
      header: COLUMNS.CHECK_IN.header,
      cell: ({ row }) => formatDateOnly(row.original.check_in),
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
    {
      accessorKey: COLUMNS.CHECK_OUT.accessorKey,
      header: COLUMNS.CHECK_OUT.header,
      cell: ({ row }) => formatDateOnly(row.original.check_out),
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
    {
      accessorKey: COLUMNS.NUMBER_OF_NIGHTS.accessorKey,
      header: COLUMNS.NUMBER_OF_NIGHTS.header,
      cell: ({ row }) => `${row.original.number_of_nights} đêm`,
      size: 80,
      minSize: 80,
      maxSize: 120,
    },
    {
      accessorKey: COLUMNS.TOTAL_GUESTS.accessorKey,
      header: COLUMNS.TOTAL_GUESTS.header,
      cell: ({ row }) => `${row.original.total_guests} người`,
      size: 80,
      minSize: 80,
      maxSize: 120,
    },
    {
      accessorKey: COLUMNS.TOTAL_AMOUNT.accessorKey,
      header: COLUMNS.TOTAL_AMOUNT.header,
      cell: ({ row }) =>
        formatCurrency(row.original.final_amount ?? row.original.total_amount),
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
    {
      accessorKey: COLUMNS.ADVANCE_PAYMENT.accessorKey,
      header: COLUMNS.ADVANCE_PAYMENT.header,
      cell: ({ row }) => formatCurrency(row.original.advance_payment),
      size: 120,
      minSize: 100,
      maxSize: 140,
    },
    {
      accessorKey: COLUMNS.STATUS.accessorKey,
      header: COLUMNS.STATUS.header,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 120,
      minSize: 80,
      maxSize: 120,
    },
    {
      accessorKey: COLUMNS.NOTES.accessorKey,
      header: COLUMNS.NOTES.header,
      cell: ({ row }) => <NotesCell notes={row.original.notes} />,
      size: 60,
      minSize: 60,
      maxSize: 80,
    },
    {
      id: "actions",
      accessorKey: "Hành động",
      header: "",
      cell: ({ row }) => {
        const defaultCancelledBooking =
          handlers?.cancelledBooking ||
          (async (id: string, _options?: CancelBookingConfirmOptions) =>
            await updateStatus(id, "cancelled"));

        const actionHandlers = {
          onEdit: handlers?.onEdit || (() => { }),
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
            (async (
              id: string,
              _options?: ConfirmBookingEmailOptions
            ) => await updateStatus(id, "confirmed")),
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
      size: 50,
      minSize: 50,
      maxSize: 90,
    },
  ];
}
