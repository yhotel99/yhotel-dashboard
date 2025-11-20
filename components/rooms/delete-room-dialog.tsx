"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Room } from "@/hooks/use-rooms";

interface DeleteRoomDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteRoomDialog({
  room,
  open,
  onOpenChange,
  onConfirm,
}: DeleteRoomDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const roomName = room?.name || "";
  const isNameMatch = confirmName.trim() === roomName;

  const handleConfirm = async () => {
    if (!isNameMatch) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmName("");
      onOpenChange(false);
    } catch {
      // Error is handled in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmName("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xóa phòng</DialogTitle>
          <DialogDescription>
            Hành động này không thể hoàn tác. Phòng sẽ bị xóa vĩnh viễn.
            <br />
            <br />
            Để xác nhận, vui lòng nhập tên phòng: <strong>{roomName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-name">Tên phòng</Label>
            <Input
              id="confirm-name"
              placeholder="Nhập tên phòng để xác nhận"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isNameMatch && !isDeleting) {
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isNameMatch || isDeleting}
          >
            {isDeleting ? "Đang xóa..." : "Xóa phòng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

