"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PaymentLogWithBooking } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/functions";
import { PaymentLogStatusBadge } from "./status";

interface PaymentLogDetailDialogProps {
  paymentLog: PaymentLogWithBooking;
}

export function PaymentLogDetailDialog({
  paymentLog,
}: PaymentLogDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết Webhook Payment</DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về webhook thanh toán
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Mã Booking
                </p>
                <p className="text-sm font-semibold">
                  {paymentLog.booking_code || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Mã Giao Dịch
                </p>
                <p className="text-sm font-semibold">
                  {paymentLog.transaction_id || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Khách hàng
                </p>
                <p className="text-sm">
                  {paymentLog.bookings?.customers?.full_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Phòng
                </p>
                <p className="text-sm">
                  {paymentLog.bookings?.rooms?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số tiền
                </p>
                <p className="text-sm">
                  {paymentLog.amount ? formatCurrency(paymentLog.amount) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ngân hàng
                </p>
                <p className="text-sm">{paymentLog.bank_code || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Trạng thái
                </p>
                <div className="text-sm mt-1">
                  <PaymentLogStatusBadge status={paymentLog.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Thời gian xử lý
                </p>
                <p className="text-sm">
                  {paymentLog.processed_at
                    ? formatDate(paymentLog.processed_at)
                    : "-"}
                </p>
              </div>
            </div>
            {paymentLog.content && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Nội dung
                </p>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {paymentLog.content}
                </p>
              </div>
            )}
            {paymentLog.raw_payload && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Raw Payload
                </p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                  {JSON.stringify(paymentLog.raw_payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
