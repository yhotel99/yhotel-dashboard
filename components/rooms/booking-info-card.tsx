"use client";

import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { BookingRecord } from "@/lib/types";
import { StatusBadge } from "@/components/bookings/status";

interface BookingInfoCardProps {
  booking: BookingRecord;
}

export function BookingInfoCard({ booking }: BookingInfoCardProps) {
  return (
    <Card className="p-3 sm:p-4 space-y-3">
      <h3 className="text-sm sm:text-base font-semibold">Thông tin đặt phòng</h3>
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Mã booking:</span>
          <span className="font-medium font-mono">
            {booking.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Khách hàng:</span>
          <span className="font-medium">
            {booking.customers?.full_name || "-"}
          </span>
        </div>
        {booking.customers?.phone && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">SĐT:</span>
            <span className="font-medium">{booking.customers.phone}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Check-in:</span>
          <span className="font-medium">{formatDate(booking.check_in)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Check-out:</span>
          <span className="font-medium">{formatDate(booking.check_out)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Số đêm:</span>
          <span className="font-medium">{booking.number_of_nights} đêm</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Số khách:</span>
          <span className="font-medium">{booking.total_guests} người</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Trạng thái:</span>
          <StatusBadge status={booking.status} />
        </div>
      </div>
    </Card>
  );
}

