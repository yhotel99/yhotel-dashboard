"use client";

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
import type { BookingRecord, UpdateBookingInput } from "@/lib/types";
import { useRooms } from "@/hooks/use-rooms";
import {
  formatCurrency,
  formatDateOnly,
  getDateISO,
  formatDateForInput,
} from "@/lib/functions";
import { calculateNightsValue, translateBookingError } from "@/lib/functions";

type EditBookingFormState = {
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  total_guests: string;
  total_amount: string;
  advance_payment: string;
  notes: string;
};

export function EditBookingDialog({
  open,
  onOpenChange,
  bookingId,
  booking,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  booking: BookingRecord | null;
  onUpdate: (id: string, input: UpdateBookingInput) => Promise<void>;
}) {
  const { rooms, mutate: refetch } = useRooms({ page: 1, limit: 100, search: "" });

  // Fetch rooms when dialog opens
  useEffect(() => {
    if (open) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Calculate initial form values from booking
  const getInitialFormValues = (): EditBookingFormState => {
    if (!booking) {
      return {
        room_id: "",
        check_in_date: "",
        check_out_date: "",
        total_guests: "1",
        total_amount: "0",
        advance_payment: "0",
        notes: "",
      };
    }
    return {
      room_id: booking.room_id || "",
      check_in_date: formatDateForInput(booking.check_in),
      check_out_date: formatDateForInput(booking.check_out),
      total_guests: booking.total_guests.toString(),
      total_amount: booking.total_amount.toString(),
      advance_payment: booking.advance_payment.toString(),
      notes: booking.notes || "",
    };
  };

  const [formValues, setFormValues] = useState<EditBookingFormState>(
    getInitialFormValues()
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load booking data when dialog opens
  useEffect(() => {
    if (open && booking) {
      setFormValues(getInitialFormValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id]);

  const handleInputChange =
    (field: keyof EditBookingFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  const resetForm = () => {
    if (booking) {
      setFormValues({
        room_id: booking.room_id || "",
        check_in_date: formatDateForInput(booking.check_in),
        check_out_date: formatDateForInput(booking.check_out),
        total_guests: booking.total_guests.toString(),
        total_amount: booking.total_amount.toString(),
        advance_payment: booking.advance_payment.toString(),
        notes: booking.notes || "",
      });
    }
    setError(null);
    setIsSubmitting(false);
  };

  // Get booking dates and room info for display
  const checkInDate = booking ? formatDateForInput(booking.check_in) : "";
  const checkOutDate = booking ? formatDateForInput(booking.check_out) : "";
  const checkInISO = booking ? getDateISO(checkInDate, false) : null;
  const checkOutISO = booking ? getDateISO(checkOutDate, true) : null;
  const nights = booking
    ? calculateNightsValue(checkInISO || "", checkOutISO || "")
    : 0;
  const selectedRoom = booking
    ? rooms.find((room) => room.id === booking.room_id)
    : null;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!booking) {
      setError("Không tìm thấy thông tin booking.");
      return;
    }

    const totalGuests = Number(formValues.total_guests);
    if (!Number.isFinite(totalGuests) || totalGuests < 1) {
      setError("Số khách phải là số nguyên dương.");
      return;
    }

    // Only update total_guests and notes
    const payload: UpdateBookingInput = {
      total_guests: totalGuests,
      notes: formValues.notes.trim() || null,
    };

    try {
      setIsSubmitting(true);
      await onUpdate(bookingId, payload);
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

  if (!booking) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-6xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa booking</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin chi tiết của booking.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Khách hàng</Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {booking.customers?.full_name || "-"}
                </p>
                {booking.customers?.phone && (
                  <p className="text-xs text-muted-foreground">
                    {booking.customers.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phòng</Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {selectedRoom?.name || booking?.rooms?.name || "-"}
                </p>
                {selectedRoom && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(selectedRoom.price_per_night)} VNĐ/đêm
                  </p>
                )}
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
              <Label>Ngày check-in</Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {booking && checkInISO ? formatDateOnly(checkInISO) : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Ngày check-out {nights > 0 ? `(${nights} đêm)` : ""}
              </Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {booking && checkOutISO ? formatDateOnly(checkOutISO) : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tổng tiền (VNĐ)</Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {booking ? formatCurrency(booking.total_amount) : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tiền cọc (VNĐ)</Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {booking ? formatCurrency(booking.advance_payment) : "-"}
                </p>
              </div>
            </div>
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
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
