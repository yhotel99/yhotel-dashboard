"use client";

import * as React from "react";
import { useState } from "react";
import {
  IconDotsVertical,
  IconEdit,
  IconRefresh,
  IconCurrencyDollar,
  IconReceiptRefund,
  IconX,
  IconQrcode,
} from "@tabler/icons-react";

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
import type {
  BookingStatus,
  BookingRecord,
  TransferBookingInput,
} from "@/lib/types";
import { CancelBookingConfirmDialog } from "./cancel-booking-confirm-dialog";
import { ChangeBookingStatusDialog } from "./change-booking-status-dialog";
import { TransferRoomDialog } from "./transfer-room-dialog";
import { MarkAdvancePaymentDialog } from "./mark-advance-payment-dialog";
import { CreateRefundRequestDialog } from "./create-refund-request-dialog";
import { BookingDetailDialog } from "./booking-detail-dialog";
import { BOOKING_STATUS } from "@/lib/constants";
import { IconEye } from "@tabler/icons-react";
import { updateQRDisplayAction } from "@/actions/qr-display";

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
  onViewDetails,
}: {
  booking: BookingRecord;
  customerId: string | null;
  onEdit: (booking: BookingRecord) => void;
  onTransfer: (id: string, input: TransferBookingInput) => Promise<void>;
  onMarkAdvancePayment: (bookingId: string) => Promise<void>;
  onCancelBooking?: (id: string) => Promise<void>;
  checkAdvancePaymentStatus?: (bookingId: string) => Promise<{
    hasAdvancePayment: boolean;
    isPaid: boolean;
    paymentId: string | null;
  }>;
  pendingBooking: (bookingId: string) => Promise<void>;
  confirmedBooking: (bookingCode: string) => Promise<void>;
  checkedInBooking: (bookingId: string) => Promise<void>;
  checkedOutBooking: (bookingId: string) => Promise<void>;
  cancelledBooking: (bookingId: string) => Promise<void>;
  onViewDetails?: (booking: BookingRecord) => void;
}) {
  const [openCancel, setOpenCancel] = useState(false);
  const [openChangeStatus, setOpenChangeStatus] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openMarkAdvancePayment, setOpenMarkAdvancePayment] = useState(false);
  const [openRefundRequest, setOpenRefundRequest] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [advancePaymentStatus, setAdvancePaymentStatus] = useState<{
    hasAdvancePayment: boolean;
    isPaid: boolean;
  } | null>(null);
  const [isCheckingAdvancePayment, setIsCheckingAdvancePayment] =
    useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // Check advance payment status only when dropdown opens (lazy check)
  const handleDropdownOpenChange = React.useCallback(
    async (open: boolean) => {
      if (
        open &&
        !hasCheckedStatus &&
        booking.advance_payment &&
        booking.advance_payment > 0 &&
        checkAdvancePaymentStatus
      ) {
        try {
          setIsCheckingAdvancePayment(true);
          const status = await checkAdvancePaymentStatus(booking.id);
          setAdvancePaymentStatus({
            hasAdvancePayment: status.hasAdvancePayment,
            isPaid: status.isPaid,
          });
          setHasCheckedStatus(true);
        } catch (error) {
          console.error("Error checking advance payment status:", error);
          setAdvancePaymentStatus({ hasAdvancePayment: false, isPaid: false });
          setHasCheckedStatus(true);
        } finally {
          setIsCheckingAdvancePayment(false);
        }
      } else if (!booking.advance_payment || booking.advance_payment <= 0) {
        setAdvancePaymentStatus({ hasAdvancePayment: false, isPaid: false });
        setHasCheckedStatus(true);
      }
    },
    [
      booking.id,
      booking.advance_payment,
      checkAdvancePaymentStatus,
      hasCheckedStatus,
    ]
  );

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

  const handleShowQR = async () => {
    try {
      // Update QR display state via Supabase Realtime
      const result = await updateQRDisplayAction(booking);
      
      if (!result.ok) {
        toast.error(result.message || "Không thể hiển thị mã QR");
        return;
      }
      
      toast.success("Đã cập nhật mã QR thành công");
    } catch (error) {
      console.error("Error showing QR:", error);
      toast.error("Không thể hiển thị mã QR");
    }
  };

  return (
    <>
      <DropdownMenu onOpenChange={handleDropdownOpenChange}>
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setOpenDetail(true)}>
            <IconEye className="mr-2 size-4" />
            Xem chi tiết
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShowQR}>
            <IconQrcode className="mr-2 size-4" />
            Hiển thị mã QR
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEdit(booking)}>
            <IconEdit className="mr-2 size-4" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenChangeStatus(true)}>
            <IconRefresh className="mr-2 size-4" />
            Thay đổi trạng thái
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
            <IconCurrencyDollar className="mr-2 size-4" />
            {advancePaymentStatus?.isPaid
              ? "Đã đánh dấu đặt cọc"
              : "Đánh dấu đặt cọc"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenRefundRequest(true)}>
            <IconReceiptRefund className="mr-2 size-4" />
            Yêu cầu hoàn tiền
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setOpenCancel(true)}
            disabled={booking.status === BOOKING_STATUS.CANCELLED}
          >
            <IconX className="mr-2 size-4" />
            Hủy booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {openCancel && (
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
      )}

      {openChangeStatus && (
        <ChangeBookingStatusDialog
          open={openChangeStatus}
          onOpenChange={setOpenChangeStatus}
          currentStatus={booking.status}
          bookingId={booking.id}
          bookingCode={booking.booking_code}
          pendingBooking={pendingBooking}
          confirmedBooking={confirmedBooking}
          checkedInBooking={checkedInBooking}
          checkedOutBooking={checkedOutBooking}
          cancelledBooking={cancelledBooking}
        />
      )}

      {openTransfer && (
        <TransferRoomDialog
          open={openTransfer}
          onOpenChange={setOpenTransfer}
          booking={booking}
          onTransfer={onTransfer}
        />
      )}

      {openMarkAdvancePayment && (
        <MarkAdvancePaymentDialog
          open={openMarkAdvancePayment}
          onOpenChange={setOpenMarkAdvancePayment}
          onConfirm={handleMarkAdvancePayment}
          amount={booking.advance_payment || undefined}
        />
      )}

      {openRefundRequest && (
        <CreateRefundRequestDialog
          open={openRefundRequest}
          onOpenChange={setOpenRefundRequest}
          booking={booking}
        />
      )}

      {openDetail && (
        <BookingDetailDialog
          open={openDetail}
          onOpenChange={setOpenDetail}
          booking={booking}
        />
      )}
    </>
  );
}
