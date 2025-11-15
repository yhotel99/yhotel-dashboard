"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { BookingRecord } from "@/lib/types";
import type { RoomWithBooking } from "@/hooks/use-room-map";
import { roomTypeLabels } from "@/lib/constants";


interface CheckoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  room: RoomWithBooking;
  isCheckingOut: boolean;
  onConfirm: () => void;
}

export function CheckoutConfirmationDialog({
  open,
  onOpenChange,
  booking,
  room,
  isCheckingOut,
  onConfirm,
}: CheckoutConfirmationDialogProps) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Xác nhận trả phòng
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Loại phòng:
              </span>
              <span className="font-medium text-xs sm:text-sm">
                {roomTypeLabels[room.room_type] || room.room_type}
              </span>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Phòng:
              </span>
              <span className="font-medium text-xs sm:text-sm break-words">
                {room.name}
              </span>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Ngày nhận phòng:
              </span>
              <span className="font-medium text-xs sm:text-sm break-words">
                {formatDate(booking.actual_check_in || booking.check_in)}
              </span>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Ngày trả phòng:
              </span>
              <span className="font-medium text-xs sm:text-sm break-words">
                {formatDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 sm:pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isCheckingOut}
            className="w-full sm:w-auto text-xs sm:text-sm py-5"
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isCheckingOut}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm py-5"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="mr-1.5 sm:mr-2 size-3 sm:size-3.5 animate-spin" />
                <span className="hidden sm:inline">Đang xử lý...</span>
                <span className="sm:hidden">Đang xử lý</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Xác nhận trả phòng</span>
                <span className="sm:hidden">Xác nhận</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

