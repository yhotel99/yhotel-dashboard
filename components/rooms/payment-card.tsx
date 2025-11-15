"use client";

import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BookingRecord } from "@/lib/types";
import type { RoomWithBooking } from "@/hooks/use-room-map";

interface PaymentCardProps {
  booking: BookingRecord;
  room?: RoomWithBooking;
}

export function PaymentCard({ booking }: PaymentCardProps) {
  return (
    <Card className="p-2.5 sm:p-3 border bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2 sm:p-2.5 bg-background/50 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CreditCard className="size-3.5 sm:size-4 text-primary shrink-0" />
            <h3 className="font-semibold text-xs sm:text-sm">Thanh toán</h3>
          </div>
          <span className="font-bold text-sm sm:text-base text-primary">
            {formatCurrency(booking.total_amount)}
          </span>
        </div>
        {/* <div className="text-sm text-muted-foreground flex items-center justify-between gap-1">
          <div>Còn lại:</div>
          <span className="font-semibold text-xs sm:text-sm text-primary">
            {formatCurrency(booking.total_amount - booking.advance_payment)}
          </span>
        </div>
        <Separator className="my-1.5 sm:my-2" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            Khách đã trả:
          </span>
          <span className="font-semibold text-xs sm:text-sm">
            {formatCurrency(booking.advance_payment)}
          </span>
        </div> */}
      </div>
    </Card>
  );
}
