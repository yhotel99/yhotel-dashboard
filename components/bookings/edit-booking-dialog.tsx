import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BookingInput, BookingRecord } from "@/hooks/use-bookings";
import { formatCurrency } from "@/lib/utils";
import {
  formatDateForInput,
  formatTimeForInput,
  translateBookingError,
} from "@/lib/functions";

export function EditBookingDialog({
  open,
  onOpenChange,
  booking,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  onUpdate: (id: string, input: Partial<BookingInput>) => Promise<void>;
}) {
  const [formValues, setFormValues] = useState({
    total_guests: "1",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load booking data into form when booking changes
  // This is necessary to sync form state with booking prop
  // Note: This pattern is intentional - we need to sync form state when booking prop changes
  useEffect(() => {
    if (booking) {
      setFormValues({
        total_guests: booking.total_guests.toString(),
        notes: booking.notes || "",
      });
      setError(null);
    }
  }, [booking]);

  const handleInputChange =
    (field: "total_guests" | "notes") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  const resetForm = () => {
    setError(null);
    setIsSubmitting(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking) return;

    setError(null);

    // Validate total_guests
    const totalGuests = Number(formValues.total_guests);
    if (!Number.isFinite(totalGuests) || totalGuests < 1) {
      setError("Số khách phải là số nguyên dương.");
      return;
    }

    // Cập nhật notes và total_guests
    const updateData: {
      notes?: string | null;
      total_guests?: number;
    } = {
      notes: formValues.notes.trim() || null,
      total_guests: totalGuests,
    };

    try {
      setIsSubmitting(true);
      await onUpdate(booking.id, updateData);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Không thể cập nhật booking";

      // Translate error messages
      const message = translateBookingError(rawMessage);
      setError(message);
      setIsSubmitting(false);
      // Không đóng dialog để người dùng có thể chỉnh sửa
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-6xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa booking</DialogTitle>
          <DialogDescription>
            Cập nhật số khách và ghi chú cho booking.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 rounded-lg border border-muted bg-muted/50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phòng</Label>
                <Input
                  value={booking.rooms?.name || booking.room_id || "-"}
                  disabled
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Check-in</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={formatDateForInput(booking.check_in)}
                    disabled
                    className="bg-background"
                  />
                  <Input
                    value={formatTimeForInput(booking.check_in)}
                    disabled
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Check-out</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={formatDateForInput(booking.check_out)}
                    disabled
                    className="bg-background"
                  />
                  <Input
                    value={formatTimeForInput(booking.check_out)}
                    disabled
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tổng tiền</Label>
                <Input
                  value={formatCurrency(booking.total_amount)}
                  className="bg-background"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>Tiền cọc hiện tại</Label>
                <Input
                  value={formatCurrency(booking.advance_payment || 0)}
                  className="bg-background"
                  readOnly
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_guests">Số khách *</Label>
            <Input
              id="total_guests"
              type="number"
              min={1}
              value={formValues.total_guests}
              onChange={handleInputChange("total_guests")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Thông tin ghi chú thêm cho booking"
              value={formValues.notes}
              onChange={handleInputChange("notes")}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
