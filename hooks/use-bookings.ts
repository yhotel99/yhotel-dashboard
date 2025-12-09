"use client";

import useSWR from "swr";
import type { BookingRecord, PaginationMeta } from "@/lib/types";

// Type for API response
type BookingsResponse = {
  data: BookingRecord[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
const fetcher = (url: string): Promise<BookingsResponse> =>
  fetch(url).then((r) => {
    if (!r.ok) {
      return r.json().then((err) => {
        throw new Error(err.error || "Không thể tải danh sách booking");
      });
    }
    return r.json();
  });

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
}: {
  search?: string;
  page?: number;
  limit?: number;
  customerId?: string | null;
}) {
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

  const { data, error, isLoading, mutate } = useSWR<BookingsResponse>(
    `/api/bookings?${params.toString()}`,
    fetcher
  );

  return {
    bookings: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách booking"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}
