"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { RefundRequestWithRelations, PaginationMeta } from "@/lib/types";

// Type for API response
type RefundRequestsResponse = {
  data: RefundRequestWithRelations[];
  pagination: PaginationMeta;
};

/**
 * Hook for fetching refund requests with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useRefundRequests(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  // Use SWR to fetch refund requests
  const { data, error, isLoading, mutate } = useSWR<RefundRequestsResponse>(
    `/api/refund-requests?${params.toString()}`,
    fetcher
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
    isLoading,
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
