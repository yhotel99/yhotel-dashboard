"use client";

import { createContext, useContext, useState, useCallback } from "react";

type RealtimeContextType = {
  newBookingsCount: number;
  hasNewBooking: boolean;
  latestBookingCode: string | null;
  shouldRefreshBookings: boolean;
  incrementBookingCount: (bookingCode: string) => void;
  resetBookingCount: () => void;
  markBookingsRefreshed: () => void;
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
