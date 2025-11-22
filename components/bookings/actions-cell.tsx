"use client";

import * as React from "react";
import { useState } from "react";
import { IconDotsVertical } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/bookings/status";
import type { BookingStatus, BookingRecord, BookingInput } from "@/lib/types";
import { CancelBookingConfirmDialog } from "./cancel-booking-confirm-dialog";
import { ChangeBookingStatusDialog } from "./change-booking-status-dialog";
import { TransferRoomDialog } from "./transfer-room-dialog";
import { MarkAdvancePaymentDialog } from "./mark-advance-payment-dialog";
import { BOOKING_STATUS } from "@/lib/constants";

// Context to update booking status from action cells
export const UpdateBookingStatusContext = React.createContext<
  (id: string, status: BookingStatus) => Promise<void>
>(async () => {});

// Status select component for inline editing
export function StatusSelect({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
}) {
  const updateStatus = React.useContext(UpdateBookingStatusContext);
  const statusConfig: Record<BookingStatus, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    checked_in: "Đã check-in",
    checked_out: "Đã check-out",
    cancelled: "Đã hủy",
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={async (value: BookingStatus) => {
        try {
          await updateStatus(bookingId, value);
          toast.success("Đã cập nhật trạng thái thành công");
        } catch {
          toast.error("Không thể cập nhật trạng thái");
        }
      }}
    >
      <SelectTrigger className="w-auto min-w-[140px] h-auto border-none shadow-none hover:bg-black/10 px-2 py-1 gap-1">
        <StatusBadge status={currentStatus} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BookingActionsCell({
  booking,
  onEdit,
  onTransfer,
  onMarkAdvancePayment,
  onCancelBooking,
  checkAdvancePaymentStatus,
  pendingBooking,
  confirmedBooking,
  checkedInBooking,
  checkedOutBooking,
  cancelledBooking,
}: {
  booking: BookingRecord;
  customerId: string | null;
  onEdit: (booking: BookingRecord) => void;
  onTransfer: (id: string, input: BookingInput) => Promise<void>;
  onMarkAdvancePayment: (bookingId: string) => Promise<void>;
  onCancelBooking?: (id: string) => Promise<void>;
  checkAdvancePaymentStatus?: (bookingId: string) => Promise<{
    hasAdvancePayment: boolean;
    isPaid: boolean;
    paymentId: string | null;
  }>;
  pendingBooking: (bookingId: string) => Promise<void>;
  confirmedBooking: (bookingId: string) => Promise<void>;
  checkedInBooking: (bookingId: string) => Promise<void>;
  checkedOutBooking: (bookingId: string) => Promise<void>;
  cancelledBooking: (bookingId: string) => Promise<void>;
}) {
  const [openCancel, setOpenCancel] = useState(false);
  const [openChangeStatus, setOpenChangeStatus] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openMarkAdvancePayment, setOpenMarkAdvancePayment] = useState(false);
  const [advancePaymentStatus, setAdvancePaymentStatus] = useState<{
    hasAdvancePayment: boolean;
    isPaid: boolean;
  } | null>(null);
  const [isCheckingAdvancePayment, setIsCheckingAdvancePayment] =
    useState(false);

  // Check advance payment status on mount
  React.useEffect(() => {
    const checkStatus = async () => {
      if (!booking.advance_payment || booking.advance_payment <= 0) {
        setAdvancePaymentStatus({ hasAdvancePayment: false, isPaid: false });
        return;
      }

      if (!checkAdvancePaymentStatus) {
        return;
      }

      try {
        setIsCheckingAdvancePayment(true);
        const status = await checkAdvancePaymentStatus(booking.id);
        setAdvancePaymentStatus({
          hasAdvancePayment: status.hasAdvancePayment,
          isPaid: status.isPaid,
        });
      } catch (error) {
        console.error("Error checking advance payment status:", error);
        setAdvancePaymentStatus({ hasAdvancePayment: false, isPaid: false });
      } finally {
        setIsCheckingAdvancePayment(false);
      }
    };

    checkStatus();
  }, [booking.id, booking.advance_payment, checkAdvancePaymentStatus]);

  const handleMarkAdvancePayment = async () => {
    try {
      await onMarkAdvancePayment(booking.id);
      toast.success("Đã đánh dấu đặt cọc thành công");
      // Refresh status
      if (checkAdvancePaymentStatus) {
        const status = await checkAdvancePaymentStatus(booking.id);
        setAdvancePaymentStatus({
          hasAdvancePayment: status.hasAdvancePayment,
          isPaid: status.isPaid,
        });
      }
    } catch (error) {
      toast.error("Không thể đánh dấu đặt cọc");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onEdit(booking)}>
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenChangeStatus(true)}>
            Thay đổi trạng thái
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpenTransfer(true)}
            disabled={booking.status !== BOOKING_STATUS.PENDING}
          >
            Chuyển phòng
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpenMarkAdvancePayment(true)}
            disabled={
              booking.status !== BOOKING_STATUS.PENDING ||
              !booking.advance_payment ||
              booking.advance_payment <= 0 ||
              advancePaymentStatus?.isPaid ||
              isCheckingAdvancePayment
            }
          >
            {advancePaymentStatus?.isPaid
              ? "Đã đánh dấu đặt cọc"
              : "Đánh dấu đặt cọc"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setOpenCancel(true)}
          >
            Hủy booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelBookingConfirmDialog
        open={openCancel}
        onOpenChange={setOpenCancel}
        onConfirm={async () => {
          if (onCancelBooking) {
            await onCancelBooking(booking.id);
          } else {
            await cancelledBooking(booking.id);
          }
        }}
      />

      <ChangeBookingStatusDialog
        open={openChangeStatus}
        onOpenChange={setOpenChangeStatus}
        currentStatus={booking.status}
        bookingId={booking.id}
        pendingBooking={pendingBooking}
        confirmedBooking={confirmedBooking}
        checkedInBooking={checkedInBooking}
        checkedOutBooking={checkedOutBooking}
        cancelledBooking={cancelledBooking}
      />

      <TransferRoomDialog
        open={openTransfer}
        onOpenChange={setOpenTransfer}
        booking={booking}
        onTransfer={onTransfer}
      />

      <MarkAdvancePaymentDialog
        open={openMarkAdvancePayment}
        onOpenChange={setOpenMarkAdvancePayment}
        onConfirm={handleMarkAdvancePayment}
        amount={booking.advance_payment || undefined}
      />
    </>
  );
}
