"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Room } from "@/hooks/use-rooms";
import { ROOM_STATUS, roomStatusLabels } from "@/lib/constants";

interface ChangeRoomStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  newStatus: "clean" | "not_clean";
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ChangeRoomStatusDialog({
  open,
  onOpenChange,
  room,
  newStatus,
  onConfirm,
  isLoading = false,
}: ChangeRoomStatusDialogProps) {
  if (!room) return null;

  const statusLabel =
    newStatus === ROOM_STATUS.CLEAN
      ? roomStatusLabels[ROOM_STATUS.CLEAN]
      : roomStatusLabels[ROOM_STATUS.NOT_CLEAN];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển trạng thái buồng phòng</DialogTitle>
          <DialogDescription className="text-base">
            Chuyển trạng thái buồng phòng {room.name} thành{" "}
            <span className="font-semibold text-destructive">
              {statusLabel}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Bỏ qua
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? "Đang xử lý..." : "Đồng ý"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
