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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BookingInput, BookingRecord } from "@/hooks/use-bookings";
import { useRooms } from "@/hooks/use-rooms";
import { TimeSelect } from "@/components/ui/time-select";
import { formatCurrency, getDateTimeISO } from "@/lib/utils";
import {
  calculateNightsValue,
  formatDateForInput,
  formatTimeForInput,
  translateBookingError,
} from "@/lib/functions";

type EditBookingFormState = {
  room_id: string;
  check_in_date: string;
  check_in_time: string;
  check_out_date: string;
  check_out_time: string;
  total_guests: string;
  total_amount: string;
  advance_payment: string;
  notes: string;
};

export function EditBookingDialog({
  open,
  onOpenChange,
  booking,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  onUpdate: (id: string, input: BookingInput) => Promise<void>;
}) {
  const [formValues, setFormValues] = useState<EditBookingFormState>({
    room_id: "",
    check_in_date: "",
    check_in_time: "14:00",
    check_out_date: "",
    check_out_time: "12:00",
    total_guests: "1",
    total_amount: "0",
    advance_payment: "0",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { rooms } = useRooms();

  // Load booking data into form when booking changes
  useEffect(() => {
    if (booking) {
      setFormValues({
        room_id: booking.room_id || "",
        check_in_date: formatDateForInput(booking.check_in),
        check_in_time: formatTimeForInput(booking.check_in),
        check_out_date: formatDateForInput(booking.check_out),
        check_out_time: formatTimeForInput(booking.check_out),
        total_guests: booking.total_guests.toString(),
        total_amount: booking.total_amount.toString(),
        advance_payment: booking.advance_payment.toString(),
        notes: booking.notes || "",
      });
      setError(null);
    }
  }, [booking]);

  // Kết hợp date và time bằng helper function để tính toán
  const checkInISO = getDateTimeISO(
    formValues.check_in_date,
    formValues.check_in_time
  );
  const checkOutISO = getDateTimeISO(
    formValues.check_out_date,
    formValues.check_out_time
  );

  const nights = calculateNightsValue(checkInISO || "", checkOutISO || "");

  // Get selected room
  const selectedRoom = rooms.find((room) => room.id === formValues.room_id);

  // Calculate total amount from room price and nights
  const calculatedTotalAmount =
    selectedRoom && nights > 0 ? selectedRoom.price_per_night * nights : 0;

  // Auto-update total amount when room or dates change
  // In edit mode, always recalculate when room/dates change
  useEffect(() => {
    if (calculatedTotalAmount > 0 && booking) {
      setFormValues((prev) => ({
        ...prev,
        total_amount: calculatedTotalAmount.toString(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formValues.room_id,
    formValues.check_in_date,
    formValues.check_in_time,
    formValues.check_out_date,
    formValues.check_out_time,
  ]);

  const handleInputChange =
    (field: keyof EditBookingFormState) =>
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

    // Kết hợp date và time bằng helper function
    const checkInISO = getDateTimeISO(
      formValues.check_in_date,
      formValues.check_in_time
    );
    const checkOutISO = getDateTimeISO(
      formValues.check_out_date,
      formValues.check_out_time
    );

    if (!checkInISO || !checkOutISO) {
      setError("Vui lòng nhập đầy đủ ngày và giờ check-in/check-out.");
      return;
    }

    const number_of_nights = calculateNightsValue(checkInISO, checkOutISO);

    if (number_of_nights <= 0) {
      setError("Ngày và giờ check-out phải sau ngày và giờ check-in.");
      return;
    }

    if (!formValues.room_id) {
      setError("Vui lòng chọn phòng.");
      return;
    }

    const totalGuests = Number(formValues.total_guests);
    if (!Number.isFinite(totalGuests) || totalGuests < 1) {
      setError("Số khách phải là số nguyên dương.");
      return;
    }

    // Validate room exists
    const selectedRoom = rooms.find((room) => room.id === formValues.room_id);
    if (!selectedRoom) {
      setError("Phòng đã chọn không tồn tại.");
      return;
    }

    // Use total_amount from form (allows manual editing)
    const totalAmount = Number(formValues.total_amount || 0);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      setError("Tổng tiền không hợp lệ.");
      return;
    }

    // const advancePayment = Number(formValues.advance_payment || 0);
    // if (!Number.isFinite(advancePayment) || advancePayment < 0) {
    //   setError("Tiền đặt cọc không hợp lệ.");
    //   return;
    // }

    // if (advancePayment > totalAmount) {
    //   setError("Tiền đặt cọc không được vượt quá tổng tiền.");
    //   return;
    // }
    const advancePayment = 0; // Đặt cọc luôn là 0

    // checkInISO và checkOutISO đã được tính ở trên bằng getDateTimeISO

    const payload: BookingInput = {
      room_id: formValues.room_id,
      check_in: checkInISO,
      check_out: checkOutISO,
      number_of_nights,
      total_guests: totalGuests,
      notes: formValues.notes.trim() || null,
      total_amount: totalAmount,
      advance_payment: advancePayment,
    };

    try {
      setIsSubmitting(true);
      await onUpdate(booking.id, payload);
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
            Cập nhật thông tin booking cho khách hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="room_id">Chọn phòng *</Label>
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
              <Label htmlFor="total_guests">Số khách *</Label>
              <Input
                id="total_guests"
                type="number"
                min={1}
                value={formValues.total_guests}
                onChange={handleInputChange("total_guests")}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ngày và giờ check-in *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="check_in_date"
                  type="date"
                  value={formValues.check_in_date}
                  onChange={handleInputChange("check_in_date")}
                  required
                />
                <TimeSelect
                  value={formValues.check_in_time}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({ ...prev, check_in_time: value }))
                  }
                  placeholder="Chọn giờ"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>
                Ngày và giờ check-out * {nights > 0 ? `(${nights} đêm)` : ""}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="check_out_date"
                  type="date"
                  value={formValues.check_out_date}
                  onChange={handleInputChange("check_out_date")}
                  required
                />
                <TimeSelect
                  value={formValues.check_out_time}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      check_out_time: value,
                    }))
                  }
                  placeholder="Chọn giờ"
                />
              </div>
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="total_amount">Tổng tiền (VNĐ) *</Label>
              <Input
                id="total_amount"
                type="number"
                min={0}
                step="1000"
                value={formValues.total_amount}
                onChange={handleInputChange("total_amount")}
                className="bg-muted w-full"
              />
              {selectedRoom && nights > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(formValues.total_amount || 0))}
                </p>
              )}
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="advance_payment">Đặt cọc (VNĐ)</Label>
              <Input
                id="advance_payment"
                type="number"
                min={0}
                step="1000"
                value={formValues.advance_payment}
                onChange={handleInputChange("advance_payment")}
              />
            </div> */}
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
