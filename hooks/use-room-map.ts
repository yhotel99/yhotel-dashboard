"use client";

import { useState, useEffect, useCallback } from "react";
import type { RoomWithBooking } from "@/lib/types";
import { fetchRoomMapData } from "@/services/rooms";

export function useRoomMap() {
  const [rooms, setRooms] = useState<RoomWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomMap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const roomsWithBookings = await fetchRoomMapData();
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
    fetchRoomMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchRoomMap,
  };
}
