"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { BookingRecord } from "@/lib/types";

type RealtimeContextType = {
  newBookingsCount: number;
  hasNewBooking: boolean;
  latestBookingCode: string | null;
  shouldRefreshBookings: boolean;
  incrementBookingCount: (bookingCode: string) => void;
  resetBookingCount: () => void;
  markBookingsRefreshed: () => void;
  displayedQRBooking: BookingRecord | null;
  setDisplayedQRBooking: (booking: BookingRecord | null) => void;
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export function RealtimeContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [latestBookingCode, setLatestBookingCode] = useState<string | null>(
    null
  );
  const [shouldRefreshBookings, setShouldRefreshBookings] = useState(false);
  const [displayedQRBooking, setDisplayedQRBooking] = useState<BookingRecord | null>(null);

  const incrementBookingCount = useCallback((bookingCode: string) => {
    setNewBookingsCount((prev) => prev + 1);
    setLatestBookingCode(bookingCode);
    setShouldRefreshBookings(true);
  }, []);

  const resetBookingCount = useCallback(() => {
    setNewBookingsCount(0);
    setLatestBookingCode(null);
  }, []);

  const markBookingsRefreshed = useCallback(() => {
    setShouldRefreshBookings(false);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        newBookingsCount,
        hasNewBooking: newBookingsCount > 0,
        latestBookingCode,
        shouldRefreshBookings,
        incrementBookingCount,
        resetBookingCount,
        markBookingsRefreshed,
        displayedQRBooking,
        setDisplayedQRBooking,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      "useRealtimeContext must be used within RealtimeContextProvider"
    );
  }
  return context;
}
