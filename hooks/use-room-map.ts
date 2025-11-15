"use client";

import { useQuery } from "@tanstack/react-query";
import {
  roomMapKeys,
  fetchRoomMapQuery,
  type RoomWithBooking,
  type RoomMapStatus,
} from "@/lib/queries/room-map";

// Re-export types for backward compatibility
export type { RoomWithBooking, RoomMapStatus } from "@/lib/queries/room-map";

// Hook for managing room map
export function useRoomMap() {
  const { data: rooms = [], isLoading, error, refetch } = useQuery({
    queryKey: roomMapKeys.list(),
    queryFn: fetchRoomMapQuery,
  });

  return {
    rooms,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch: async () => {
      await refetch();
    },
  };
}
