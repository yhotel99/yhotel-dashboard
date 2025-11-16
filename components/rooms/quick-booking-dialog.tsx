import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog";
import type { BookingInput } from "@/hooks/use-bookings";
import type { RoomWithBooking } from "@/lib/types";

interface QuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomWithBooking;
  onCreate: (input: BookingInput) => Promise<void>;
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  room,
  onCreate,
}: QuickBookingDialogProps) {
  return (
    <CreateBookingDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultRoomId={room.id}
      onCreate={onCreate}
    />
  );
}
