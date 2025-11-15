"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { IconEdit } from "@tabler/icons-react";
import type { BookingRecord } from "@/lib/types";
import { useBookings } from "@/hooks/use-bookings";
import { toast } from "sonner";

interface BookingNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  onSave: (updatedBooking: BookingRecord) => void;
}

export function BookingNotesDialog({
  open,
  onOpenChange,
  booking,
  onSave,
}: BookingNotesDialogProps) {
  const [notesValue, setNotesValue] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const { updateBookingNotes } = useBookings();

  useEffect(() => {
    if (open && booking) {
      setNotesValue(booking.notes || "");
    }
  }, [open, booking]);

  const handleSaveNotes = async () => {
    if (!booking) return;

    try {
      setIsSavingNotes(true);
      const updatedBooking = await updateBookingNotes(
        booking.id,
        notesValue || null
      );
      toast.success("Lưu ghi chú thành công");
      // Gọi onSave với updated booking để update state trong CheckoutDialog
      onSave(updatedBooking);
      onOpenChange(false);
    } catch (error) {
      toast.error("Lưu ghi chú thất bại", {
        description:
          error instanceof Error ? error.message : "Không thể lưu ghi chú",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCancel = () => {
    if (booking) {
      setNotesValue(booking.notes || "");
    }
    onOpenChange(false);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Ghi chú đặt phòng
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Thêm hoặc chỉnh sửa ghi chú cho đặt phòng này
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="relative">
              <IconEdit className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none z-10" />
              <Textarea
                placeholder="Nhập ghi chú cho đặt phòng này..."
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                className="pl-10 min-h-[140px] sm:min-h-[180px] text-sm sm:text-base resize-y"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {notesValue.length > 0
                ? `${notesValue.length} ký tự`
                : "Chưa có ghi chú"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSavingNotes}
            className="min-w-[100px]"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="min-w-[100px] bg-green-600 hover:bg-green-700 text-white"
          >
            {isSavingNotes ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
