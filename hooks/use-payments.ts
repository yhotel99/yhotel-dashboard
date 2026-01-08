"use client";

import useSWR, { SWRConfiguration } from "swr";
import type { PaymentsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";



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
  fallbackData,
}: {
  search?: string;
  page?: number;
  limit?: number;
  bookingId?: string | null;
  fallbackData?: PaymentsResponse;
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

  const config: SWRConfiguration<PaymentsResponse> = {
  }
  if(fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<PaymentsResponse>(`/api/payments?${params.toString()}`, fetcher, config);

  return {
    payments: data?.data || [],
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
        : "Không thể tải danh sách thanh toán"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}
