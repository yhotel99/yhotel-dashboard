"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { BookingRecord } from "@/lib/types";

// Tính thời gian đã sử dụng
function calculateUsedDuration(
  checkIn: string,
  actualCheckIn: string | null
): string {
  const startDate = actualCheckIn ? new Date(actualCheckIn) : new Date(checkIn);
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} ngày ${remainingHours} giờ ${minutes} phút`;
  }
  return `${hours} giờ ${minutes} phút`;
}

// Tính thời gian lưu trú (tổng)
function calculateStayDuration(checkIn: string, checkOut: string): string {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  return `${hours} giờ`;
}

interface BookingInfoCardProps {
  booking: BookingRecord;
}

export function BookingInfoCard({ booking }: BookingInfoCardProps) {
  return (
    <Card className="p-2.5 sm:p-3 border">
      <div className="space-y-1 mb-2 sm:mb-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Calendar className="size-3.5 sm:size-4 text-primary shrink-0" />
          <h3 className="font-semibold text-xs sm:text-sm">
            Thông tin đặt phòng
          </h3>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 mt-1 sm:mt-0 text-green-600"
        >
          <Clock className="size-2 sm:size-2.5 mr-0.5 sm:mr-1 shrink-0" />
          <span className="hidden sm:inline">Đã sử dụng: </span>
          <span className="text-[9px] sm:text-[10px]">
            {calculateUsedDuration(booking.check_in, booking.actual_check_in)}
          </span>
        </Badge>
      </div>
      <div className="space-y-2 mt-2 sm:mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1 sm:space-y-1.5">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Mã đặt phòng
            </p>
            <p className="font-semibold text-xs sm:text-sm font-mono break-all">
              {booking.id.slice(0, 8)}
            </p>
          </div>
          <div className="space-y-1 sm:space-y-1.5">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Thời gian lưu trú
            </p>
            <p className="font-medium text-xs sm:text-sm">
              {calculateStayDuration(booking.check_in, booking.check_out)}
            </p>
          </div>
        </div>
        <Separator className="my-1.5 sm:my-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1 sm:space-y-1.5">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Nhận phòng
            </p>
            <p className="font-medium text-xs sm:text-sm break-words">
              {formatDate(booking.check_in)}
            </p>
          </div>
          <div className="space-y-1 sm:space-y-1.5">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Trả phòng
            </p>
            <p className="font-medium text-xs sm:text-sm break-words">
              {formatDate(booking.check_out)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

