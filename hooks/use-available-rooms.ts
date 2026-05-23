"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Room } from "@/lib/types";

export type AvailableRoomData = {
  room: Room;
  availablePeriods: Array<{
    from: string;
    to: string;
    days: number;
  }>;
};

export type AvailableRoomsResponse = {
  data: AvailableRoomData[];
};

/**
 * Hook for fetching available rooms in the next 30 days
 */
export function useAvailableRooms(branchId: string | null = null) {
  const params = new URLSearchParams();
  if (branchId) {
    params.append("branchId", branchId);
  }
  const url = params.toString()
    ? `/api/available-rooms-30days?${params.toString()}`
    : "/api/available-rooms-30days";

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<AvailableRoomsResponse>(url, fetcher, {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false,
    });

  return {
    availableRooms: data?.data || [],
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách phòng trống"
      : null,
    refetch: mutate,
    mutate,
  };
}