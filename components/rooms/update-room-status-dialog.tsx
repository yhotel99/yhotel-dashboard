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
import { Badge } from "@/components/ui/badge";
import { ROOM_STATUS, roomStatusLabels } from "@/lib/constants";
import { Room } from "@/lib/types";
import { IconSparkles, IconCheck, IconTool } from "@tabler/icons-react";
import { BrushCleaning } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Lấy config cho badge dựa trên room status (giống như room-card)
  const getStatusConfig = (status: Room["status"]) => {
    switch (status) {
      case ROOM_STATUS.AVAILABLE:
        return {
          label: roomStatusLabels[ROOM_STATUS.AVAILABLE],
          className:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
          icon: IconCheck,
        };
      case ROOM_STATUS.CLEAN:
        return {
          label: "Sạch", // Dùng "Sạch" thay vì "Đã dọn" cho ngắn gọn (giống room-card)
          className:
            "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
          icon: IconSparkles,
        };
      case ROOM_STATUS.NOT_CLEAN:
        return {
          label: roomStatusLabels[ROOM_STATUS.NOT_CLEAN],
          className:
            "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
          icon: BrushCleaning,
        };
      case ROOM_STATUS.MAINTENANCE:
        return {
          label: roomStatusLabels[ROOM_STATUS.MAINTENANCE],
          className:
            "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
          icon: IconTool,
        };
      default:
        return {
          label: roomStatusLabels[status] || "Không xác định",
          className:
            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
          icon: IconSparkles,
        };
    }
  };

  // Xác định status mặc định để chọn: nếu AVAILABLE thì chọn CLEAN, ngược lại dùng status hiện tại
  const getDefaultSelectedStatus = (
    currentStatus: Room["status"]
  ): Room["status"] => {
    if (currentStatus === ROOM_STATUS.AVAILABLE) {
      return ROOM_STATUS.CLEAN;
    }
    return currentStatus;
  };

  const [selectedStatus, setSelectedStatus] = useState<Room["status"] | "">(
    room ? getDefaultSelectedStatus(room.status) : ""
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Update selected status when room changes
  useEffect(() => {
    if (room) {
      setSelectedStatus(getDefaultSelectedStatus(room.status));
    }
  }, [room]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStatus(room ? getDefaultSelectedStatus(room.status) : "");
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (!room) return;

    const defaultStatus = getDefaultSelectedStatus(room.status);

    if (!selectedStatus || selectedStatus === defaultStatus) {
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

  // Không cho hiển thị popup nếu trạng thái là BẢO TRÌ
  if (!room || room.status === ROOM_STATUS.MAINTENANCE) return null;

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
              {(() => {
                const statusConfig = getStatusConfig(room.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium gap-1.5 w-fit",
                      statusConfig.className
                    )}
                  >
                    <StatusIcon className="size-3" />
                    {statusConfig.label}
                  </Badge>
                );
              })()}
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
              isUpdating ||
              !selectedStatus ||
              !room ||
              selectedStatus === getDefaultSelectedStatus(room.status)
            }
          >
            {isUpdating ? "Đang cập nhật..." : "Cập nhật trạng thái"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
