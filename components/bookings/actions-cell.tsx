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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
              onClick={() => router.push(`/dashboard/customers/${customerId}/bookings`)}
            >
              Xem khách hàng
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setOpenCancel(true)}>
            Hủy booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy booking</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ hủy booking này và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCancel(false)}>
              Bỏ qua
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await onCancelBooking(booking.id);
                setOpenCancel(false);
              }}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


