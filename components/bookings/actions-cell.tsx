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
import { ChangeBookingStatusDialog } from "./change-booking-status-dialog";
import type { BookingRecord, BookingStatus } from "@/hooks/use-bookings";

export function BookingActionsCell({
  booking,
  customerId,
  onEdit,
  onTransfer,
  onCancelBooking,
  onChangeStatus,
}: {
  booking: BookingRecord;
  customerId: string | null;
  onEdit: (booking: BookingRecord) => void;
  onTransfer: (booking: BookingRecord) => void;
  onCancelBooking: (id: string) => Promise<void>;
  onChangeStatus: (id: string, status: BookingStatus) => Promise<void>;
}) {
  const router = useRouter();
  const [openCancel, setOpenCancel] = useState(false);
  const [openChangeStatus, setOpenChangeStatus] = useState(false);
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
          <DropdownMenuItem onClick={() => setOpenChangeStatus(true)}>
            Thay đổi trạng thái
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTransfer(booking)}>
            Chuyển phòng
          </DropdownMenuItem>
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

      <ChangeBookingStatusDialog
        open={openChangeStatus}
        onOpenChange={setOpenChangeStatus}
        currentStatus={booking.status}
        onConfirm={async (status) => {
          await onChangeStatus(booking.id, status);
        }}
      />
    </>
  );
}
