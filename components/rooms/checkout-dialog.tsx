"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RoomWithBooking } from "@/lib/types";
import { toast } from "sonner";
import { IconEdit } from "@tabler/icons-react";
import type { BookingRecord } from "@/lib/types";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { useBookings } from "@/hooks/use-bookings";
import { cn } from "@/lib/utils";
import {
  roomTypeLabels,
  ROOM_MAP_STATUS,
  roomMapStatusLabels,
} from "@/lib/constants";
import { CheckoutDialogSkeleton } from "./checkout-dialog-skeleton";
import { BookingInfoCard } from "./booking-info-card";
import { PaymentCard } from "./payment-card";
import { NotesCard } from "./notes-card";
import { CheckoutConfirmationDialog } from "./checkout-confirmation-dialog";
import { BookingNotesDialog } from "./booking-notes-dialog";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomWithBooking;
  onCheckout: () => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  room,
  onCheckout,
}: CheckoutDialogProps) {
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const { updateBooking, getBookingByIdWithDetails, checkoutBooking } =
    useBookings();

  const fetchBookingDetails = async () => {
    if (!room.currentBooking?.id) return;

    try {
      setIsLoading(true);
      const bookingData = await getBookingByIdWithDetails(
        room.currentBooking.id
      );
      setBooking(bookingData);
    } catch (error) {
      toast.error("Không thể tải thông tin booking", {
        description:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi tải thông tin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch booking details when dialog opens
  useEffect(() => {
    const bookingId = room.currentBooking?.id;
    if (open && bookingId) {
      fetchBookingDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room.currentBooking?.id ?? null]);

  const handleCheckoutClick = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleCheckout = async () => {
    if (!booking) return;

    try {
      setIsCheckingOut(true);
      setIsConfirmDialogOpen(false);
      await checkoutBooking(booking.id);

      toast.success("Check-out thành công", {
        description: `Phòng ${room.name} đã được check-out.`,
      });

      onCheckout();
      onOpenChange(false);
    } catch (error) {
      toast.error("Check-out thất bại", {
        description:
          error instanceof Error
            ? error.message
            : "Không thể thực hiện check-out",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleUpdateBooking = async (
    id: string,
    input: Parameters<typeof updateBooking>[1]
  ) => {
    try {
      await updateBooking(id, input);
      toast.success("Cập nhật booking thành công");
      setIsEditDialogOpen(false);
      await fetchBookingDetails();
    } catch (error) {
      throw error;
    }
  };

  const handleNotesClick = () => {
    setIsNotesDialogOpen(true);
  };

  const handleSaveNotes = (updatedBooking: BookingRecord) => {
    // Update state trực tiếp thay vì fetch lại
    setBooking((prevBooking) => {
      if (!prevBooking) return prevBooking;
      // Giữ nguyên relations từ booking cũ nếu updated booking không có
      return {
        ...updatedBooking,
        customers: updatedBooking.customers ?? prevBooking.customers,
      };
    });
    // Không cần refresh room map vì lưu ghi chú không ảnh hưởng đến room status
  };

  if (!room.currentBooking) {
    return null;
  }

  const roomTypeLabel = roomTypeLabels[room.room_type] || room.room_type;
  const mapStatusLabel =
    room.mapStatus === ROOM_MAP_STATUS.OCCUPIED
      ? roomMapStatusLabels[ROOM_MAP_STATUS.OCCUPIED]
      : room.mapStatus === ROOM_MAP_STATUS.UPCOMING_CHECKOUT
      ? roomMapStatusLabels[ROOM_MAP_STATUS.UPCOMING_CHECKOUT]
      : roomMapStatusLabels[ROOM_MAP_STATUS.OVERDUE_CHECKOUT];

  const statusColorClass =
    room.mapStatus === ROOM_MAP_STATUS.OCCUPIED
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
      : room.mapStatus === ROOM_MAP_STATUS.UPCOMING_CHECKOUT
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:min-w-[600px] md:max-w-6xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <DialogHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight truncate">
                  Chi tiết {room.name}
                </DialogTitle>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {roomTypeLabel}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium border shrink-0",
                      statusColorClass
                    )}
                  >
                    {mapStatusLabel}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <CheckoutDialogSkeleton />
          ) : booking ? (
            <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
              {/* Hàng 1: Thông tin đặt phòng và Thanh toán */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <BookingInfoCard booking={booking} />
                <PaymentCard booking={booking} room={room} />
              </div>

              {/* Ghi chú */}
              <NotesCard booking={booking} onClick={handleNotesClick} />
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Không tìm thấy thông tin booking
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {booking && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="w-full sm:w-auto sm:min-w-[120px] text-xs sm:text-sm py-5"
              >
                <IconEdit className="mr-1.5 sm:mr-2 size-3 sm:size-3.5" />
                <span className="hidden sm:inline">Sửa đặt phòng</span>
                <span className="sm:hidden">Sửa</span>
              </Button>
              <Button
                size="sm"
                onClick={handleCheckoutClick}
                disabled={isCheckingOut}
                className="w-full sm:w-auto sm:min-w-[120px] bg-green-600 hover:bg-green-800 text-white text-xs py-5 sm:text-sm"
              >
                Trả phòng
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      {booking && (
        <EditBookingDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          booking={booking}
          onUpdate={handleUpdateBooking}
        />
      )}

      {/* Checkout Confirmation Dialog */}
      <CheckoutConfirmationDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        booking={booking}
        room={room}
        isCheckingOut={isCheckingOut}
        onConfirm={handleCheckout}
      />

      {/* Notes Dialog */}
      <BookingNotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        booking={booking}
        onSave={handleSaveNotes}
      />
    </>
  );
}
