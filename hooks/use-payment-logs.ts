"use client";

import useSWR, { SWRConfiguration } from "swr";
import type { PaymentLogsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

/**
 * Hook for fetching payment logs with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 */
export function usePaymentLogs({
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
  fallbackData?: PaymentLogsResponse;
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

  const config: SWRConfiguration<PaymentLogsResponse> = {};
  if (fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<PaymentLogsResponse>(
      `/api/payment-logs?${params.toString()}`,
      fetcher,
      config
    );

  return {
    paymentLogs: data?.data || [],
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
        : "Không thể tải danh sách lịch sử thanh toán"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}

