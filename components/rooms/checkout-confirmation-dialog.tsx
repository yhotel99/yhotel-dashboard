"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookingRecord, RoomWithBooking } from "@/lib/types";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận check-out</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn check-out phòng <strong>{room.name}</strong>?
            Thao tác này sẽ đánh dấu booking là đã check-out.
          </DialogDescription>
        </DialogHeader>
        {booking && (
          <div className="py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã booking:</span>
              <span className="font-medium font-mono">
                {booking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Khách hàng:</span>
              <span className="font-medium">
                {booking.customers?.full_name || "-"}
              </span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCheckingOut}
          >
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCheckingOut}
            className="bg-green-600 hover:bg-green-700"
          >
            {isCheckingOut ? "Đang xử lý..." : "Xác nhận check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

