"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/functions";
import type { BookingRecord, RoomWithBooking, PaymentWithBooking } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "@/components/payments/status";
import { PAYMENT_TYPE } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";

interface PaymentCardProps {
  booking: BookingRecord;
  room: RoomWithBooking;
}

type PaymentsResponse = {
  data: PaymentWithBooking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export function PaymentCard({ booking }: PaymentCardProps) {
  const bookingId = booking.id || null;
  const { data, isLoading } = useSWR<PaymentsResponse>(
    bookingId
      ? `/api/payments?bookingId=${bookingId}&page=1&limit=100`
      : null,
    fetcher
  );

  const payments = data?.data || [];

  const advancePayment = payments.find(
    (p) => p.payment_type === PAYMENT_TYPE.ADVANCE_PAYMENT
  );
  const roomCharge = payments.find(
    (p) => p.payment_type === PAYMENT_TYPE.ROOM_CHARGE
  );

  return (
    <Card className="p-3 sm:p-4 space-y-3">
      <h3 className="text-sm sm:text-base font-semibold">Thanh toán</h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tổng tiền gốc:</span>
            <span className="font-medium">
              {formatCurrency(booking.total_amount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              Số tiền thanh toán cuối cùng:
            </span>
            <span className="font-medium">
              {formatCurrency(booking.final_amount ?? booking.total_amount)}
            </span>
          </div>
          {advancePayment && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tiền cọc:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatCurrency(advancePayment.amount)}
                </span>
                <PaymentStatusBadge status={advancePayment.payment_status} />
              </div>
            </div>
          )}
          {roomCharge && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tiền phòng:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatCurrency(roomCharge.amount)}
                </span>
                <PaymentStatusBadge status={roomCharge.payment_status} />
              </div>
            </div>
          )}
          {!advancePayment && !roomCharge && (
            <p className="text-muted-foreground text-xs">
              Chưa có thông tin thanh toán
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
