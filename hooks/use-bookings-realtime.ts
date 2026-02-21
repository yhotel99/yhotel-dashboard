"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeContext } from "@/contexts/realtime-context";

/**
 * Hook để lắng nghe realtime updates cho bookings
 * Cập nhật state global khi có booking mới
 */
export function useBookingRealtime() {
  const { incrementBookingCount } = useRealtimeContext();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("booking-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("🎉 Booking mới được tạo:", payload);

          const bookingCode = payload.new.booking_code || "N/A";
          
          // Cập nhật state global
          incrementBookingCount(bookingCode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incrementBookingCount]);
}
