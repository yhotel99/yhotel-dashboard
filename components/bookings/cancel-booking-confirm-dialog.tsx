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

interface CancelBookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export function CancelBookingConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: CancelBookingConfirmDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by parent component (toast)
      // Keep dialog open so user can retry or cancel
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận hủy booking</DialogTitle>
          <DialogDescription>
            Thao tác này sẽ hủy booking này và không thể hoàn tác. Bạn có chắc
            chắn muốn tiếp tục?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bỏ qua
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Xác nhận hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

