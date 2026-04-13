"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { IconLoader2 } from "@tabler/icons-react";

export type CancelBookingConfirmOptions = {
  sendCancellationEmail: boolean;
};

interface CancelBookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: CancelBookingConfirmOptions) => Promise<void> | void;
}

export function CancelBookingConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: CancelBookingConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sendCancellationEmail, setSendCancellationEmail] = useState(true);

  useEffect(() => {
    if (open) {
      setSendCancellationEmail(true);
    }
  }, [open]);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm({ sendCancellationEmail });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by parent component (toast)
      // Keep dialog open so user can retry or cancel
    } finally {
      setIsLoading(false);
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
        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="cancel-booking-send-email"
            checked={sendCancellationEmail}
            onCheckedChange={(value) =>
              setSendCancellationEmail(value === true)
            }
          />
          <Label
            htmlFor="cancel-booking-send-email"
            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Gửi email thông báo hủy cho khách
          </Label>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Bỏ qua
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                Đang hủy...
              </>
            ) : (
              "Xác nhận hủy"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

