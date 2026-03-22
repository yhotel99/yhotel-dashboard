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
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PaymentWithBooking } from "@/lib/types";
import {
  formatCurrency,
  formatDateOnly,
  formatRoomNumbersWithTypeNameFallback,
} from "@/lib/functions";
import { useRoomNumberLookup } from "@/hooks/use-room-number-lookup";
import { PaymentStatusBadge } from "./status";
import { paymentTypeLabels, paymentMethodLabels } from "@/lib/constants";

interface PaymentDetailDialogProps {
  payment: PaymentWithBooking;
}

export function PaymentDetailDialog({ payment }: PaymentDetailDialogProps) {
  const { data: roomNumberById } = useRoomNumberLookup();
  const roomLabel = formatRoomNumbersWithTypeNameFallback(
    {
      room_id: null,
      rooms: payment.bookings?.rooms ?? undefined,
      booking_rooms: undefined,
    },
    roomNumberById
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>Chi tiết thanh toán</DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về giao dịch thanh toán
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Mã thanh toán
                </p>
                <p className="text-sm font-semibold uppercase">{payment.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Mã booking
                </p>
                <p className="text-sm font-semibold uppercase">
                  {payment.booking_id}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Khách hàng
                </p>
                <p className="text-sm">
                  {payment.bookings?.customers?.full_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số điện thoại
                </p>
                <p className="text-sm">
                  {payment.bookings?.customers?.phone || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số phòng
                </p>
                <p className="text-sm">{roomLabel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số tiền
                </p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Loại thanh toán
                </p>
                <p className="text-sm">
                  {paymentTypeLabels[
                    payment.payment_type as keyof typeof paymentTypeLabels
                  ] ?? payment.payment_type}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Phương thức thanh toán
                </p>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {paymentMethodLabels[payment.payment_method] ||
                    payment.payment_method}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Trạng thái
                </p>
                <div className="text-sm mt-1">
                  <PaymentStatusBadge status={payment.payment_status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ngày thanh toán
                </p>
                <p className="text-sm">
                  {payment.paid_at ? formatDateOnly(payment.paid_at) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ngày tạo
                </p>
                <p className="text-sm">{formatDateOnly(payment.created_at)}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
