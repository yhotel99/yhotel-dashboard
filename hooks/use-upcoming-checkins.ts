"use client";

import useSWR, { SWRConfiguration } from "swr";
import type { BookingsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

/**
 * Hook for fetching upcoming check-ins with SWR
 * @param search - Search term
 * @param fallbackData - Initial data from server
 */
export function useUpcomingCheckins({
  search = "",
  branchId = null,
  fallbackData,
}: {
  search?: string;
  branchId?: string | null;
  fallbackData?: BookingsResponse;
}) {
  const config: SWRConfiguration<BookingsResponse> = {
    refreshInterval: 30000, // Refresh every 30 seconds
  };

  // Build query parameters
  const params = new URLSearchParams({
    limit: "100", // Get more items for kanban view
  });
  
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  if (branchId) {
    params.append("branchId", branchId);
  }

  if (fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<BookingsResponse>(`/api/upcoming-checkins?${params.toString()}`, fetcher, config);

  return {
    bookings: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    },
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách phòng sắp nhận"
      : null,
    refetch: mutate,
    mutate,
  };
}