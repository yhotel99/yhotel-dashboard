"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { RoomWithBooking } from "@/lib/types";

// Type for API response
type ReservationsResponse = {
  data: RoomWithBooking[];
};

export function useReservation() {
  // Use a static key for reservation data
  const swrKey = "/api/reservations";

  // Use SWR to fetch reservation data with caching and deduplication
  const { data, error, isLoading, mutate } = useSWR<ReservationsResponse>(
    swrKey,
    fetcher
  );

  const rooms = data?.data || [];
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Không thể tải sơ đồ phòng"
    : null;

  return {
    rooms,
    isLoading,
    error: errorMessage,
    refetch: mutate,
    mutate,
  };
}
