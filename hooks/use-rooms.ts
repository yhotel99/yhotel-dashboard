"use client";

import useSWR, { SWRConfiguration } from "swr";
import type { RoomsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";



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
  branchId = null,
  fallbackData,
}: {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string | null;
  fallbackData?: RoomsResponse;
}) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (branchId) {
    params.append("branchId", branchId);
  }

  const config: SWRConfiguration<RoomsResponse> = {
  }
  if(fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<RoomsResponse>(`/api/rooms?${params.toString()}`, fetcher, config);

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
