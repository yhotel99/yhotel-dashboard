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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BookingInput, BookingRecord } from "@/lib/types";
import { useRooms } from "@/hooks/use-rooms";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  calculateNightsValue,
  translateBookingError,
  formatNumberWithSeparators,
  parseFormattedNumber,
} from "@/lib/functions";

type TransferRoomFormState = {
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  advance_payment: string;
};

// Helper function to convert date string to ISO string (with default time)
// Check-in default: 14:00, Check-out default: 12:00
function getDateISO(date: string, isCheckOut: boolean = false): string | null {
  if (!date) return null;
  // Format: yyyy-MM-dd
  // Add default time: 14:00 for check-in, 12:00 for check-out
  const time = isCheckOut ? "12:00" : "14:00";
  const dateTimeString = `${date} ${time}`;
  const dateObj = new Date(dateTimeString);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
}

// Helper to convert ISO date to YYYY-MM-DD format
function formatDateForInput(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TransferRoomDialog({
  open,
  onOpenChange,
  booking,
  onTransfer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  onTransfer: (id: string, input: BookingInput) => Promise<void>;
}) {
  const [formValues, setFormValues] = useState<TransferRoomFormState>({
    room_id: "",
    check_in_date: "",
    check_out_date: "",
    advance_payment: "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { rooms } = useRooms();

  // Check if booking is in pending status
  const isPending = booking?.status === "pending";

  // Load booking data when dialog opens
  useEffect(() => {
    if (open && booking) {
      setFormValues({
        room_id: booking.room_id || "",
        check_in_date: formatDateForInput(booking.check_in),
        check_out_date: formatDateForInput(booking.check_out),
        advance_payment: booking.advance_payment.toString(),
      });
    }
  }, [open, booking]);

  // Convert dates to ISO strings with default times
  const checkInISO = getDateISO(formValues.check_in_date, false);
  const checkOutISO = getDateISO(formValues.check_out_date, true);

  const nights = calculateNightsValue(checkInISO || "", checkOutISO || "");

  // Get selected room
  const selectedRoom = rooms.find((room) => room.id === formValues.room_id);

  // Calculate total amount from room price and nights
  const calculatedTotalAmount =
    selectedRoom && nights > 0 ? selectedRoom.price_per_night * nights : 0;

  // Auto-update total amount when room or dates change
  useEffect(() => {
    if (calculatedTotalAmount > 0) {
      // Keep the calculated total amount for display, but don't update form
      // as we'll use it in the payload
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues.room_id, formValues.check_in_date, formValues.check_out_date]);

  // Format advance_payment when total amount changes (to update max value display)
  useEffect(() => {
    if (formValues.advance_payment) {
      const currentValue = parseFormattedNumber(formValues.advance_payment);
      const maxValue = calculatedTotalAmount || booking?.total_amount || 0;

      // If current value exceeds new max, cap it
      if (currentValue > maxValue) {
        setFormValues((prev) => ({
          ...prev,
          advance_payment: formatNumberWithSeparators(maxValue),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTotalAmount, booking?.total_amount]);

  const handleInputChange =
    (field: keyof TransferRoomFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      // Format advance_payment with thousand separators
      if (field === "advance_payment") {
        const formatted = formatNumberWithSeparators(value);
        setFormValues((prev) => ({ ...prev, [field]: formatted }));
      } else {
        setFormValues((prev) => ({ ...prev, [field]: value }));
      }
    };

  const resetForm = () => {
    if (booking) {
      setFormValues({
        room_id: booking.room_id || "",
        check_in_date: formatDateForInput(booking.check_in),
        check_out_date: formatDateForInput(booking.check_out),
        advance_payment: booking.advance_payment.toString(),
      });
    }
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
    setError(null);

    if (!booking) {
      setError("Không tìm thấy thông tin booking.");
      return;
    }

    if (!isPending) {
      setError("Chỉ có thể chuyển phòng khi booking ở trạng thái pending.");
      return;
    }

    // Convert dates to ISO strings with default times
    const checkInISO = getDateISO(formValues.check_in_date, false);
    const checkOutISO = getDateISO(formValues.check_out_date, true);

    if (!checkInISO || !checkOutISO) {
      setError("Vui lòng nhập đầy đủ ngày check-in và check-out.");
      return;
    }

    const number_of_nights = calculateNightsValue(checkInISO, checkOutISO);

    if (number_of_nights <= 0) {
      setError("Ngày check-out phải sau ngày check-in.");
      return;
    }

    if (!formValues.room_id) {
      setError("Vui lòng chọn phòng.");
      return;
    }

    // Validate room exists
    const selectedRoom = rooms.find((room) => room.id === formValues.room_id);
    if (!selectedRoom) {
      setError("Phòng đã chọn không tồn tại.");
      return;
    }

    // Use calculated total amount or booking's total amount
    const totalAmount = calculatedTotalAmount || booking.total_amount;

    // Validate advance_payment (parse from formatted string)
    const advancePayment = parseFormattedNumber(
      formValues.advance_payment || "0"
    );
    if (!Number.isFinite(advancePayment) || advancePayment < 0) {
      setError("Tiền cọc phải là số không âm.");
      return;
    }

    if (advancePayment > totalAmount) {
      setError("Tiền cọc không được vượt quá tổng tiền.");
      return;
    }

    const payload: BookingInput = {
      room_id: formValues.room_id,
      check_in: checkInISO,
      check_out: checkOutISO,
      number_of_nights,
      total_guests: booking.total_guests,
      notes: booking.notes,
      total_amount: totalAmount,
      advance_payment: advancePayment,
    };

    try {
      setIsSubmitting(true);
      await onTransfer(booking.id, payload);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Không thể chuyển phòng";

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

  // Show error if not pending
  if (!isPending) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chuyển phòng</DialogTitle>
            <DialogDescription>
              Không thể chuyển phòng cho booking này.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-destructive">
              Chỉ có thể chuyển phòng khi booking ở trạng thái pending. Booking
              hiện tại đang ở trạng thái{" "}
              <span className="font-medium">{booking.status}</span>.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-6xl">
        <DialogHeader>
          <DialogTitle>Chuyển phòng</DialogTitle>
          <DialogDescription>
            Chuyển booking sang phòng khác và cập nhật thông tin liên quan.
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
              <Label htmlFor="room_id">Chọn phòng mới *</Label>
              <Select
                value={formValues.room_id}
                onValueChange={(v) =>
                  setFormValues((prev) => ({ ...prev, room_id: v }))
                }
              >
                <SelectTrigger id="room_id" className="w-full">
                  <SelectValue placeholder="Chọn phòng" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 ? (
                    <SelectItem value="no_room" disabled>
                      Không có phòng
                    </SelectItem>
                  ) : (
                    rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} -{" "}
                        {new Intl.NumberFormat("vi-VN").format(
                          room.price_per_night
                        )}{" "}
                        VNĐ/đêm
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tổng tiền (VNĐ)</Label>
              <div className="rounded-md border bg-muted px-3 py-2">
                <p className="text-sm font-medium">
                  {formatCurrency(
                    calculatedTotalAmount || booking.total_amount
                  )}
                </p>
                {selectedRoom && nights > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {nights} đêm ×{" "}
                    {formatCurrency(selectedRoom.price_per_night)}
                    /đêm
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_in_date">Ngày check-in *</Label>
              <Input
                id="check_in_date"
                type="date"
                value={formValues.check_in_date}
                onChange={handleInputChange("check_in_date")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_out_date">
                Ngày check-out * {nights > 0 ? `(${nights} đêm)` : ""}
              </Label>
              <Input
                id="check_out_date"
                type="date"
                value={formValues.check_out_date}
                onChange={handleInputChange("check_out_date")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance_payment">Tiền cọc (VNĐ)</Label>
              <Input
                id="advance_payment"
                type="text"
                inputMode="numeric"
                value={formValues.advance_payment}
                onChange={handleInputChange("advance_payment")}
                placeholder="Nhập số tiền cọc (VD: 1.000.000)"
              />
              <p className="text-xs text-muted-foreground">
                Tối đa:{" "}
                {formatCurrency(calculatedTotalAmount || booking.total_amount)}
              </p>
            </div>
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
              {isSubmitting ? "Đang chuyển..." : "Chuyển phòng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
