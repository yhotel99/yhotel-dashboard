"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import type { Room } from "@/hooks/use-rooms";
import { ROOM_STATUS, roomStatusLabels } from "@/lib/constants";
import { StatusBadge } from "./status-badge";

interface UpdateRoomStatusDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (roomId: string, newStatus: Room["status"]) => Promise<void>;
}

export function UpdateRoomStatusDialog({
  room,
  open,
  onOpenChange,
  onConfirm,
}: UpdateRoomStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<Room["status"] | "">(
    room?.status || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Update selected status when room changes
  useEffect(() => {
    if (room) {
      setSelectedStatus(room.status);
    }
  }, [room]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStatus(room?.status || "");
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (!room || !selectedStatus || selectedStatus === room.status) {
      return;
    }

    setIsUpdating(true);
    try {
      await onConfirm(room.id, selectedStatus);
      handleOpenChange(false);
    } catch (error) {
      // Error is handled in parent component
      console.error("Error updating room status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thay đổi trạng thái phòng</DialogTitle>
          <DialogDescription>
            Chọn trạng thái mới cho phòng <strong>{room.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Trạng thái hiện tại</Label>
            <div>
              <StatusBadge status={room.status} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-status">Trạng thái mới</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as Room["status"])
              }
            >
              <SelectTrigger id="new-status" className="w-full">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOM_STATUS.AVAILABLE}>
                  {roomStatusLabels[ROOM_STATUS.AVAILABLE]}
                </SelectItem>
                <SelectItem value={ROOM_STATUS.MAINTENANCE}>
                  {roomStatusLabels[ROOM_STATUS.MAINTENANCE]}
                </SelectItem>
                <SelectItem value={ROOM_STATUS.NOT_CLEAN}>
                  {roomStatusLabels[ROOM_STATUS.NOT_CLEAN]}
                </SelectItem>
                <SelectItem value={ROOM_STATUS.CLEAN}>
                  {roomStatusLabels[ROOM_STATUS.CLEAN]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUpdating}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isUpdating || !selectedStatus || selectedStatus === room.status
            }
          >
            {isUpdating ? "Đang cập nhật..." : "Cập nhật trạng thái"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
