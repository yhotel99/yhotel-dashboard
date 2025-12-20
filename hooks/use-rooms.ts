"use client";

import useSWR from "swr";
import type { Room, PaginationMeta } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

// Type for API response
type RoomsResponse = {
  data: Room[];
  pagination: PaginationMeta;
};

/**
 * Hook for fetching rooms with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 */
export function useRooms({
  search = "",
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<RoomsResponse>(`/api/rooms?${params.toString()}`, fetcher);

  return {
    rooms: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách phòng"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}
