"use client";

import { useBookingRealtime } from "@/hooks/use-bookings-realtime";
import { RealtimeContextProvider } from "@/contexts/realtime-context";
import { NewBookingPanel } from "@/components/new-booking-panel";

/**
 * Provider global để lắng nghe realtime updates
 * Wrap ở root layout để áp dụng cho toàn bộ app
 */
export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeContextProvider>
      <RealtimeListener />
      <NewBookingPanel />
      {children}
    </RealtimeContextProvider>
  );
}

function RealtimeListener() {
  useBookingRealtime();
  return null;
}
