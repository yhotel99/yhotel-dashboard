"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { updateBooking } = useBookings();

  useEffect(() => {
    if (booking) {
      setNotes(booking.notes || "");
    }
  }, [booking]);

  const handleSave = async () => {
    if (!booking) return;

    try {
      setIsSaving(true);
      const updated = await updateBooking(booking.id, {
        notes: notes.trim() || null,
      });
      onSave(updated);
      toast.success("Đã lưu ghi chú");
      onOpenChange(false);
    } catch (error) {
      toast.error("Không thể lưu ghi chú", {
        description:
          error instanceof Error ? error.message : "Có lỗi xảy ra",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi chú booking</DialogTitle>
          <DialogDescription>
            Thêm hoặc chỉnh sửa ghi chú cho booking này
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Nhập ghi chú..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

