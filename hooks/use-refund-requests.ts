"use client";

import { useCallback } from "react";
import useSWR, { SWRConfiguration } from "swr";
import { fetcher } from "@/lib/fetcher";
import type {  PaginationMeta, RefundRequestsResponse } from "@/lib/types";


/**
 * Hook for fetching refund requests with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useRefundRequests(
{
  page = 1,
  limit = 10,
  search = "",
  fallbackData,
}: {
  page?: number;
  limit?: number;
  search?: string;
  fallbackData?: RefundRequestsResponse;
}
) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const config: SWRConfiguration<RefundRequestsResponse> = {
  }
  if(fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  // Use SWR to fetch refund requests
  const { data, error, isLoading, mutate, isValidating } =
    useSWR<RefundRequestsResponse>(
      `/api/refund-requests?${params.toString()}`,
      fetcher, config
    );

  const refundRequests = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Refetch refund requests
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    refundRequests,
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách yêu cầu hoàn tiền"
      : null,
    pagination,
    refetch,
    mutate, // dùng để refresh sau khi CRUD
  };
}
