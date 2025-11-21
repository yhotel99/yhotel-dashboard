"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { BookingRecord, RoomWithBooking } from "@/lib/types";
import { usePayments } from "@/hooks/use-payments";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "@/components/payments/status";

interface PaymentCardProps {
  booking: BookingRecord;
  room: RoomWithBooking;
}

export function PaymentCard({ booking, room }: PaymentCardProps) {
  const { getPaymentsByBookingId } = usePayments();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        const data = await getPaymentsByBookingId(booking.id);
        setPayments(data || []);
      } catch (error) {
        console.error("Error fetching payments:", error);
        setPayments([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (booking.id) {
      fetchPayments();
    }
  }, [booking.id, getPaymentsByBookingId]);

  const advancePayment = payments.find(
    (p) => p.payment_type === "advance_payment"
  );
  const roomCharge = payments.find((p) => p.payment_type === "room_charge");

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
            <span className="text-muted-foreground">Tổng tiền:</span>
            <span className="font-medium">
              {formatCurrency(booking.total_amount)}
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

