"use client";

import { useState } from "react";
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
import { updateBooking as updateBookingAction } from "@/actions/bookings";
import { toast } from "sonner";

interface BookingNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  onSave: (updatedBooking: BookingRecord) => void;
}

// Internal component that resets when booking changes via key prop
function BookingNotesForm({
  booking,
  onSave,
  onCancel,
}: {
  booking: BookingRecord;
  onSave: (updatedBooking: BookingRecord) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState(booking.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateBookingAction(booking.id, {
      notes: notes.trim() || null,
    });

    if (result.ok) {
      onSave(result.data);
      toast.success("Đã lưu ghi chú");
      onCancel();
    } else {
      toast.error("Không thể lưu ghi chú", {
        description: result.message,
      });
    }

    setIsSaving(false);
  };

  return (
    <>
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
          onClick={onCancel}
          disabled={isSaving}
        >
          Hủy
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function BookingNotesDialog({
  open,
  onOpenChange,
  booking,
  onSave,
}: BookingNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi chú booking</DialogTitle>
          <DialogDescription>
            Thêm hoặc chỉnh sửa ghi chú cho booking này
          </DialogDescription>
        </DialogHeader>
        {booking && (
          <BookingNotesForm
            key={booking.id}
            booking={booking}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
