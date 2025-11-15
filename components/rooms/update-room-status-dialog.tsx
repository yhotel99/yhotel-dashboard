"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Room } from "@/hooks/use-rooms";
import { StatusBadge } from "./status";

interface UpdateRoomStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  onConfirm: (roomId: string, newStatus: Room["status"]) => Promise<void>;
}

const statusOptions: Array<{
  value: Room["status"];
  label: string;
}> = [
  { value: "available", label: "Có sẵn" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "occupied", label: "Đang sử dụng" },
  { value: "not_clean", label: "Chưa dọn" },
  { value: "clean", label: "Đã dọn" },
  { value: "blocked", label: "Đang chặn" },
];

export function UpdateRoomStatusDialog({
  open,
  onOpenChange,
  room,
  onConfirm,
}: UpdateRoomStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<Room["status"] | "">("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset selected status when dialog opens or room changes
  useEffect(() => {
    if (open && room) {
      setSelectedStatus(room.status);
    }
  }, [open, room]);

  const handleConfirm = async () => {
    if (!room || !selectedStatus || selectedStatus === room.status) {
      return;
    }

    try {
      setIsUpdating(true);
      await onConfirm(room.id, selectedStatus);
      onOpenChange(false);
    } catch {
      // Error is handled in parent component
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStatus(room?.status || "");
    }
    onOpenChange(newOpen);
  };

  if (!room) return null;

  const hasChanged = selectedStatus !== room.status;

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
            <Label htmlFor="status-select">Trạng thái mới</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as Room["status"])
              }
            >
              <SelectTrigger id="status-select" className="w-full">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
            disabled={!hasChanged || isUpdating}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isUpdating ? "Đang cập nhật..." : "Cập nhật"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
