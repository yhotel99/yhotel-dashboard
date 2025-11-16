import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconDotsVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CancelBookingConfirmDialog } from "./cancel-booking-confirm-dialog";
import type { BookingRecord } from "@/hooks/use-bookings";

export function BookingActionsCell({
  booking,
  customerId,
  onEdit,
  onCancelBooking,
}: {
  booking: BookingRecord;
  customerId: string | null;
  onEdit: (booking: BookingRecord) => void;
  onCancelBooking: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [openCancel, setOpenCancel] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onEdit(booking)}>
            Chỉnh sửa
          </DropdownMenuItem>
          {customerId ? (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/customers/${customerId}/bookings`)
              }
            >
              Xem khách hàng
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setOpenCancel(true)}
          >
            Hủy booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelBookingConfirmDialog
        open={openCancel}
        onOpenChange={setOpenCancel}
        onConfirm={async () => {
          await onCancelBooking(booking.id);
        }}
      />
    </>
  );
}
