"use client";

import useSWR, { SWRConfiguration } from "swr";
import type { BookingsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";


/**
 * Hook for fetching bookings with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @param customerId - Optional customer ID to filter bookings
 */
export function useBookings({
  search = "",
  page = 1,
  limit = 10,
  customerId = null,
  fallbackData,
}: {
  search?: string;
  page?: number;
  limit?: number;
  customerId?: string | null;
  fallbackData?: BookingsResponse;
}) {

  const config: SWRConfiguration<BookingsResponse> = {
  }
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (customerId) {
    params.append("customerId", customerId);
  }

  if(fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<BookingsResponse>(`/api/bookings?${params.toString()}`, fetcher, config);


  return {
    bookings: data?.data || [],
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
        : "Không thể tải danh sách booking"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}
