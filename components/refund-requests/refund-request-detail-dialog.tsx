"use client";

import {
  IconCalendar,
  IconMessage,
  IconNotes,
  IconInfoCircle,
  IconListDetails,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RefundRequestWithRelations } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { Badge } from "@/components/ui/badge";
import {
  REFUND_REQUEST_STATUS,
  refundRequestStatusLabels,
} from "@/lib/constants";

interface RefundRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refundRequest: RefundRequestWithRelations | null;
}

// Refund request status colors
const refundRequestStatusColors: Record<string, string> = {
  [REFUND_REQUEST_STATUS.PENDING]:
    "bg-yellow-100 text-yellow-800 border-yellow-300",
  [REFUND_REQUEST_STATUS.APPROVED]: "bg-blue-100 text-blue-800 border-blue-300",
  [REFUND_REQUEST_STATUS.REJECTED]: "bg-red-100 text-red-800 border-red-300",
  [REFUND_REQUEST_STATUS.REFUNDED]:
    "bg-green-100 text-green-800 border-green-300",
};

export function RefundRequestDetailDialog({
  open,
  onOpenChange,
  refundRequest,
}: RefundRequestDetailDialogProps) {
  if (!refundRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconListDetails className="size-5" />
            Chi tiết yêu cầu hoàn tiền
          </DialogTitle>
          <DialogDescription>
            Thông tin mã yêu cầu: {refundRequest.id.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-6 pb-4">
            {/* Status & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-4 rounded-lg">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Số tiền hoàn trả
                </label>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(refundRequest.amount)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground text-right block">
                  Trạng thái
                </label>
                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={`${
                      refundRequestStatusColors[refundRequest.status]
                    } border text-sm px-3 py-1`}
                  >
                    {refundRequestStatusLabels[refundRequest.status]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Booking & Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IconInfoCircle className="size-4" />
                Thông tin đặt phòng
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Khách hàng
                  </label>
                  <p className="text-base font-medium">
                    {refundRequest.bookings?.customers?.full_name || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Số điện thoại
                  </label>
                  <p className="text-base">
                    {refundRequest.bookings?.customers?.phone || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Phòng
                  </label>
                  <p className="text-base font-medium">
                    {refundRequest.bookings?.rooms?.name || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Mã booking (ID)
                  </label>
                  <p className="text-base font-mono text-sm uppercase">
                    {refundRequest.booking_id}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Reason & Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IconMessage className="size-4" />
                Lý do & Ghi chú
              </h3>
              <div className="space-y-4">
                <div className="space-y-1 bg-muted/30 p-3 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconMessage className="size-4" />
                    Lý do yêu cầu
                  </label>
                  <p className="text-base italic whitespace-pre-wrap">
                    {refundRequest.reason || "Không có lý do được cung cấp."}
                  </p>
                </div>

                <div className="space-y-1 bg-muted/30 p-3 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconNotes className="size-4" />
                    Ghi chú nội bộ
                  </label>
                  <p className="text-base whitespace-pre-wrap">
                    {refundRequest.note || "Không có ghi chú."}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timestamps & Profiles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IconCalendar className="size-4" />
                Thông tin hệ thống
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Ngày yêu cầu
                  </label>
                  <p className="text-base">
                    {formatDateOnly(refundRequest.created_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Người yêu cầu
                  </label>
                  <p className="text-base font-medium">
                    {refundRequest.request_by_profile?.full_name || "-"}
                  </p>
                </div>

                {refundRequest.approved_by && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Người duyệt
                      </label>
                      <p className="text-base">
                        {refundRequest.approved_by_profile?.full_name || "-"}
                      </p>
                    </div>
                  </>
                )}

                {refundRequest.refunded_by && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Người thực hiện hoàn tiền
                      </label>
                      <p className="text-base">
                        {refundRequest.refunded_by_profile?.full_name || "-"}
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Cập nhật lần cuối
                  </label>
                  <p className="text-base">
                    {formatDateOnly(refundRequest.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
