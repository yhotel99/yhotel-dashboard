"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconAlertCircle } from "@tabler/icons-react";

interface MarkAdvancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  amount?: number;
}

export function MarkAdvancePaymentDialog({
  open,
  onOpenChange,
  onConfirm,
  amount,
}: MarkAdvancePaymentDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by parent component (toast)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận đánh dấu đặt cọc</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn đánh dấu đặt cọc cho booking này?
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4">
          <IconAlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Lưu ý quan trọng
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Hành động này sẽ đánh dấu payment đặt cọc là đã thanh toán và không thể hoàn tác.
              {amount && (
                <span className="block mt-1 font-semibold">
                  Số tiền: {new Intl.NumberFormat("vi-VN").format(amount)} VNĐ
                </span>
              )}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác nhận đánh dấu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

