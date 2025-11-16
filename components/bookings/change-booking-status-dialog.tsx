import { useState, useMemo } from "react";
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
import { Card } from "@/components/ui/card";
import { IconArrowRight, IconAlertCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/hooks/use-bookings";
import { BOOKING_STATUS, bookingStatusLabels } from "@/lib/constants";
import { StatusBadge } from "./status";
import { useAuth } from "@/contexts/auth-context";
import {
  getAllowedStatusTransitions,
  isStatusTransitionAllowed,
} from "@/lib/utils/booking-status-permissions";
import { UserRole } from "@/lib/types";

interface ChangeBookingStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: BookingStatus;
  onConfirm: (status: BookingStatus) => Promise<void> | void;
  isLoading?: boolean;
}

// Get confirmation message based on status
function getStatusConfirmationMessage(status: BookingStatus): string {
  switch (status) {
    case BOOKING_STATUS.CANCELLED:
      return "Bạn có chắc chắn muốn hủy booking này?";
    case BOOKING_STATUS.CHECKED_IN:
      return "Bạn có chắc chắn muốn check-in cho booking này?";
    case BOOKING_STATUS.CHECKED_OUT:
      return "Bạn có chắc chắn muốn check-out cho booking này?";
    case BOOKING_STATUS.COMPLETED:
      return "Bạn có chắc chắn muốn đánh dấu booking này là hoàn tất?";
    case BOOKING_STATUS.NO_SHOW:
      return "Bạn có chắc chắn muốn đánh dấu booking này là không đến?";
    case BOOKING_STATUS.REFUNDED:
      return "Bạn có chắc chắn muốn đánh dấu booking này là đã hoàn tiền?";
    case BOOKING_STATUS.AWAITING_PAYMENT:
      return "Bạn có chắc chắn muốn chuyển booking này sang trạng thái chờ thanh toán?";
    case BOOKING_STATUS.CONFIRMED:
      return "Bạn có chắc chắn muốn xác nhận booking này?";
    case BOOKING_STATUS.PENDING:
      return "Bạn có chắc chắn muốn chuyển booking này về trạng thái chờ xác nhận?";
    default:
      return "Bạn có chắc chắn muốn thay đổi trạng thái booking này?";
  }
}

export function ChangeBookingStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onConfirm,
  isLoading: externalIsLoading = false,
}: ChangeBookingStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<BookingStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();

  // Get user role, default to "staff" if not available
  const userRole = (profile?.role || "staff") as UserRole;

  // Get allowed status transitions based on role
  const allowedStatuses = useMemo(
    () => getAllowedStatusTransitions(currentStatus, userRole),
    [currentStatus, userRole]
  );

  // Reset selected status when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedStatus(currentStatus);
      setIsLoading(false);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (selectedStatus === currentStatus) {
      handleOpenChange(false);
      return;
    }

    // Validate transition is allowed
    if (!isStatusTransitionAllowed(currentStatus, selectedStatus, userRole)) {
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm(selectedStatus);
      // Only close dialog on success
      handleOpenChange(false);
    } catch (error) {
      console.log(error);
      // Error is handled by parent component (toast)
      // Keep dialog open so user can retry or cancel
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || externalIsLoading;

  const isStatusChanged = selectedStatus !== currentStatus;
  const confirmationMessage = getStatusConfirmationMessage(selectedStatus);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md min-w-[520px]">
        <DialogHeader>
          <DialogTitle>Thay đổi trạng thái booking</DialogTitle>
          <DialogDescription>
            Chọn trạng thái mới cho booking này
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current and New Status Comparison */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Current Status */}
            <Card className="p-4 border-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
                  Trạng thái hiện tại
                </p>
                <div className="flex items-center justify-center min-h-[32px]">
                  <StatusBadge status={currentStatus} />
                </div>
              </div>
            </Card>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <IconArrowRight className="size-5 text-muted-foreground" />
            </div>

            {/* New Status */}
            <Card
              className={cn(
                "p-4 border-2 transition-colors",
                isStatusChanged ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
                  Trạng thái mới
                </p>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) =>
                    setSelectedStatus(value as BookingStatus)
                  }
                >
                  <SelectTrigger className="flex items-center justify-center w-full h-auto py-2 border-none shadow-none bg-transparent hover:bg-transparent">
                    <SelectValue>
                      <StatusBadge status={selectedStatus} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.length === 0 ? (
                      <SelectItem value="no_allowed" disabled>
                        Không có trạng thái
                      </SelectItem>
                    ) : (
                      allowedStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {bookingStatusLabels[status]}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>

          {/* Confirmation Message */}
          {isStatusChanged && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4">
              <IconAlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Xác nhận thay đổi
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {confirmationMessage}
                </p>
              </div>
            </div>
          )}

          {/* No allowed statuses warning */}
          {allowedStatuses.length === 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
              <IconAlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Không thể thay đổi trạng thái
                </p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  Bạn không có quyền thay đổi trạng thái từ{" "}
                  <span className="font-medium">
                    {bookingStatusLabels[currentStatus]}
                  </span>
                  . Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isProcessing || !isStatusChanged || allowedStatuses.length === 0
            }
          >
            {isProcessing ? "Đang xử lý..." : "Xác nhận thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
