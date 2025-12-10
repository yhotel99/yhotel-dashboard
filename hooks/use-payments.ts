"use client";

import useSWR from "swr";
import type { PaymentWithBooking, PaginationMeta } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

// Type for API response
type PaymentsResponse = {
  data: PaymentWithBooking[];
  pagination: PaginationMeta;
};

/**
 * Hook for fetching payments with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @param bookingId - Optional booking ID to filter payments
 */
export function usePayments({
  search = "",
  page = 1,
  limit = 10,
  bookingId = null,
}: {
  search?: string;
  page?: number;
  limit?: number;
  bookingId?: string | null;
}) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (bookingId) {
    params.append("bookingId", bookingId);
  }

  const { data, error, isLoading, mutate } = useSWR<PaymentsResponse>(
    `/api/payments?${params.toString()}`,
    fetcher
  );

  return {
    payments: data?.data || [],
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
        : "Không thể tải danh sách thanh toán"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}
