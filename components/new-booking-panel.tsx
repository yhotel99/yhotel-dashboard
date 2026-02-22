"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeContext } from "@/contexts/realtime-context";
import { Button } from "@/components/ui/button";
import { IconX, IconCalendar } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Mini panel hiển thị ở góc màn hình khi có booking mới
 * Tự động ẩn sau 10 giây hoặc khi user click
 */
export function NewBookingPanel() {
  const router = useRouter();
  const { hasNewBooking, newBookingsCount, latestBookingCode, resetBookingCount } =
    useRealtimeContext();
  const [isVisible, setIsVisible] = useState(false);
  const lastCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if new booking arrived
    const hasNewBookingArrived = hasNewBooking && newBookingsCount > lastCountRef.current;

    if (hasNewBookingArrived) {
      // Update last count
      lastCountRef.current = newBookingsCount;
      
      // Show panel
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Auto hide after 10 seconds
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    }
    
    // Reset when count goes to 0
    if (newBookingsCount === 0) {
      lastCountRef.current = 0;
      setIsVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [hasNewBooking, newBookingsCount]);

  const handleViewNow = () => {
    setIsVisible(false);
    resetBookingCount();
    router.push("/dashboard/bookings");
  };

  const handleClose = () => {
    setIsVisible(false);
    // Reset count để badge cũng biến mất
    resetBookingCount();
  };

  if (!isVisible || !hasNewBooking) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-80 rounded-lg border bg-card p-4 shadow-lg transition-all duration-300",
        "animate-in slide-in-from-bottom-5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <IconCalendar className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Booking mới! 🎉</h3>
            <p className="text-sm text-muted-foreground">
              {newBookingsCount === 1
                ? `Mã: ${latestBookingCode}`
                : `${newBookingsCount} booking mới`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={handleClose}
        >
          <IconX className="size-4" />
        </Button>
      </div>

      <Button
        onClick={handleViewNow}
        className="mt-3 w-full"
        size="sm"
      >
        Xem ngay
      </Button>
    </div>
  );
}
