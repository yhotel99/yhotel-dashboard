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
import type { BookingRecord } from "@/hooks/use-bookings";
import { useRooms } from "@/hooks/use-rooms";
import { TimeSelect } from "@/components/ui/time-select";
import { formatCurrency, getDateTimeISO } from "@/lib/utils";
import { BOOKING_STATUS } from "@/lib/constants";
import {
  calculateNightsValue,
  formatDateForInput,
  formatTimeForInput,
  translateBookingError,
  formatNumberWithSeparators,
  parseFormattedNumber,
} from "@/lib/functions";

type TransferRoomFormState = {
  room_id: string;
  check_in_date: string;
  check_in_time: string;
  check_out_date: string;
  check_out_time: string;
  total_amount: string;
  advance_payment: string;
};

export function TransferRoomDialog({
  open,
  onOpenChange,
  booking,
  onTransfer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
  onTransfer: (
    id: string,
    input: {
      room_id?: string | null;
      check_in?: string;
      check_out?: string;
      number_of_nights?: number;
      total_amount?: number;
      advance_payment?: number;
    }
  ) => Promise<void>;
}) {
  const [formValues, setFormValues] = useState<TransferRoomFormState>({
    room_id: "",
    check_in_date: "",
    check_in_time: "14:00",
    check_out_date: "",
    check_out_time: "12:00",
    total_amount: "0",
    advance_payment: "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { rooms } = useRooms();

  // Helper function to format date for input type="date" (YYYY-MM-DD)
  const formatDateForDateInput = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Load booking data into form when booking changes or dialog opens
  useEffect(() => {
    if (booking && open) {
      setFormValues({
        room_id: booking.room_id || "",
        check_in_date: formatDateForDateInput(booking.check_in),
        check_in_time: formatTimeForInput(booking.check_in),
        check_out_date: formatDateForDateInput(booking.check_out),
        check_out_time: formatTimeForInput(booking.check_out),
        total_amount: booking.total_amount.toString(),
        advance_payment: formatNumberWithSeparators(
          booking.advance_payment || 0
        ),
      });
      setError(null);
    }
  }, [booking, open]);

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

  // Format advance_payment when total_amount changes (to update max value display)
  useEffect(() => {
    if (formValues.advance_payment) {
      const currentValue = parseFormattedNumber(formValues.advance_payment);
      const maxValue = Number(formValues.total_amount || 0);
      // If current value exceeds new max, cap it
      if (currentValue > maxValue) {
        setFormValues((prev) => ({
          ...prev,
          advance_payment: formatNumberWithSeparators(maxValue),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues.total_amount]);

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

    // Chỉ cho phép transfer khi booking ở trạng thái pending hoặc awaiting_payment
    const canTransfer =
      booking.status === BOOKING_STATUS.PENDING ||
      booking.status === BOOKING_STATUS.AWAITING_PAYMENT;

    if (!canTransfer) {
      setError(
        "Chỉ có thể chuyển phòng khi booking ở trạng thái Chờ xác nhận hoặc Chờ thanh toán."
      );
      return;
    }

    // Validate and prepare transfer data
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

    // Validate room exists
    const selectedRoomForSubmit = rooms.find(
      (room) => room.id === formValues.room_id
    );
    if (!selectedRoomForSubmit) {
      setError("Phòng đã chọn không tồn tại.");
      return;
    }

    // Calculate total amount from room price and nights
    const totalAmount =
      selectedRoomForSubmit && number_of_nights > 0
        ? selectedRoomForSubmit.price_per_night * number_of_nights
        : 0;

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError(
        "Tổng tiền không hợp lệ. Vui lòng kiểm tra lại phòng và số đêm."
      );
      return;
    }

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

    // Transfer data: room_id, check_in, check_out, number_of_nights, total_amount, advance_payment
    const transferData: {
      room_id?: string | null;
      check_in?: string;
      check_out?: string;
      number_of_nights?: number;
      total_amount?: number;
      advance_payment?: number;
    } = {
      room_id: formValues.room_id,
      check_in: checkInISO,
      check_out: checkOutISO,
      number_of_nights,
      total_amount: totalAmount,
      advance_payment: advancePayment,
    };

    try {
      setIsSubmitting(true);
      await onTransfer(booking.id, transferData);
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

  if (!booking) return null;

  // Check if booking status allows transfer
  const canTransfer =
    booking.status === BOOKING_STATUS.PENDING ||
    booking.status === BOOKING_STATUS.AWAITING_PAYMENT;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-6xl">
        <DialogHeader>
          <DialogTitle>Chuyển phòng</DialogTitle>
          <DialogDescription>
            Chuyển booking sang phòng khác hoặc thay đổi ngày
            check-in/check-out.
            {!canTransfer && (
              <span className="block mt-2">
                Chỉ có thể chuyển phòng khi booking ở trạng thái{" "}
                <span className="text-blue-500">Chờ xác nhận</span> hoặc{" "}
                <span className="text-amber-500">Chờ thanh toán</span>.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {canTransfer ? (
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
                      setFormValues((prev) => ({
                        ...prev,
                        check_in_time: value,
                      }))
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
                <Label htmlFor="total_amount">Tổng tiền (VNĐ)</Label>
                <Input
                  id="total_amount"
                  type="text"
                  value={formatCurrency(Number(formValues.total_amount || 0))}
                  disabled
                  className="bg-muted w-full"
                />
                {selectedRoom && nights > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tự động tính từ: {selectedRoom.name} × {nights} đêm ={" "}
                    {formatCurrency(calculatedTotalAmount)}
                  </p>
                )}
              </div>
              <div className="space-y-2 w-full">
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
                  Tối đa: {formatCurrency(Number(formValues.total_amount || 0))}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-muted bg-muted/50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phòng hiện tại</Label>
                  <Input
                    value={booking.rooms?.name || "-"}
                    disabled
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-in</Label>
                  <Input
                    value={formatDateForInput(booking.check_in)}
                    disabled
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out</Label>
                  <Input
                    value={formatDateForInput(booking.check_out)}
                    disabled
                    className="bg-background"
                  />
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
          )}
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
              disabled={isSubmitting || !canTransfer}
              className="min-w-[140px]"
            >
              {isSubmitting ? "Đang chuyển phòng..." : "Chuyển phòng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
