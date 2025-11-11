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
import type { BookingInput } from "@/hooks/use-bookings";
import { useRooms } from "@/hooks/use-rooms";
import { useCustomers } from "@/hooks/use-customers";

function calculateNightsValue(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (
    isNaN(checkInDate.getTime()) ||
    isNaN(checkOutDate.getTime()) ||
    checkOutDate <= checkInDate
  ) {
    return 0;
  }
  return Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

type CreateBookingFormState = {
  full_name: string;
  email: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  total_guests: string;
  total_amount: string;
  advance_payment: string;
  notes: string;
};

const initialCreateBookingState: CreateBookingFormState = {
  full_name: "",
  email: "",
  room_id: "",
  check_in_date: "",
  check_out_date: "",
  total_guests: "1",
  total_amount: "0",
  advance_payment: "0",
  notes: "",
};

export function CreateBookingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: BookingInput) => Promise<void>;
}) {
  const [formValues, setFormValues] = useState<CreateBookingFormState>(
    initialCreateBookingState
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { rooms } = useRooms();
  const { getCustomerByEmail, createCustomer } = useCustomers();

  const nights = calculateNightsValue(
    formValues.check_in_date,
    formValues.check_out_date
  );

  // Get selected room
  const selectedRoom = rooms.find((room) => room.id === formValues.room_id);

  // Calculate total amount from room price and nights
  const calculatedTotalAmount =
    selectedRoom && nights > 0 ? selectedRoom.price_per_night * nights : 0;

  // Update total amount when room or dates change
  const updateTotalAmount = () => {
    if (calculatedTotalAmount > 0) {
      setFormValues((prev) => ({
        ...prev,
        total_amount: calculatedTotalAmount.toString(),
      }));
    }
  };

  // Update total when room_id changes
  useEffect(() => {
    updateTotalAmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues.room_id]);

  // Update total when check-in or check-out dates change
  useEffect(() => {
    updateTotalAmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues.check_in_date, formValues.check_out_date]);

  const handleInputChange =
    (field: keyof CreateBookingFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  const resetForm = () => {
    setFormValues(initialCreateBookingState);
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

    const number_of_nights = calculateNightsValue(
      formValues.check_in_date,
      formValues.check_out_date
    );

    if (number_of_nights <= 0) {
      setError("Ngày check-out phải sau ngày check-in.");
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

    // Calculate total amount from room price and nights
    const selectedRoom = rooms.find((room) => room.id === formValues.room_id);
    if (!selectedRoom) {
      setError("Phòng đã chọn không tồn tại.");
      return;
    }

    const totalAmount = selectedRoom.price_per_night * number_of_nights;

    const advancePayment = Number(formValues.advance_payment || 0);
    if (!Number.isFinite(advancePayment) || advancePayment < 0) {
      setError("Tiền đặt cọc không hợp lệ.");
      return;
    }

    if (advancePayment > totalAmount) {
      setError("Tiền đặt cọc không được vượt quá tổng tiền.");
      return;
    }

    const fullName = formValues.full_name.trim();
    const email = formValues.email.trim();

    // Find or create customer by email
    let customerId: string | null = null;
    if (email) {
      try {
        let customer = await getCustomerByEmail(email);
        if (!customer && fullName) {
          // Create new customer if not found
          customer = await createCustomer({
            full_name: fullName,
            email: email,
          });
        }
        if (customer) {
          customerId = customer.id;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tìm hoặc tạo khách hàng";
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }
    }

    if (customerId) {
      const payload: BookingInput = {
        customer_id: customerId,
        room_id: formValues.room_id,
        check_in_date: formValues.check_in_date,
        check_out_date: formValues.check_out_date,
        number_of_nights,
        total_guests: totalGuests,
        notes: formValues.notes.trim() || null,
        total_amount: totalAmount,
        advance_payment: advancePayment,
      };

      try {
        setIsSubmitting(true);
        await onCreate(payload);
        resetForm();
        onOpenChange(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo booking";
        setError(errorMessage);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-6xl">
        <DialogHeader>
          <DialogTitle>Tạo booking mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết để tạo booking mới cho khách hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Nhập họ và tên khách hàng"
                value={formValues.full_name}
                onChange={handleInputChange("full_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email khách hàng"
                value={formValues.email}
                onChange={handleInputChange("email")}
              />
            </div>
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
              <Label htmlFor="total_amount">Tổng tiền (VNĐ) *</Label>
              <Input
                id="total_amount"
                type="number"
                min={0}
                step="1000"
                value={formValues.total_amount}
                onChange={handleInputChange("total_amount")}
                readOnly
                className="bg-muted"
              />
              {selectedRoom && nights > 0 && (
                <p className="text-xs text-muted-foreground">
                  {nights} đêm ×{" "}
                  {new Intl.NumberFormat("vi-VN").format(
                    selectedRoom.price_per_night
                  )}{" "}
                  VNĐ/đêm
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance_payment">Đặt cọc (VNĐ)</Label>
              <Input
                id="advance_payment"
                type="number"
                min={0}
                step="1000"
                value={formValues.advance_payment}
                onChange={handleInputChange("advance_payment")}
              />
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
              {isSubmitting ? "Đang tạo..." : "Tạo booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
