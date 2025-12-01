"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchReservationData } from "@/services/reservation";
import type { RoomWithBooking } from "@/lib/types";

export function useReservation() {
  const [rooms, setRooms] = useState<RoomWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const roomsWithBookings = await fetchReservationData();
      setRooms(roomsWithBookings);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể tải sơ đồ phòng";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchReservation,
  };
}
