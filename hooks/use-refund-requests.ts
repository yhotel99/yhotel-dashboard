"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { PaginationMeta, RefundRequestsResponse } from "@/lib/types";
import { listSwrConfig } from "@/lib/list-swr";

export type RefundRequestsSwrParams = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | null;
};

export function buildRefundRequestsSwrKey({
  page = 1,
  limit = 10,
  search = "",
  branchId = null,
}: RefundRequestsSwrParams): string {
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
  return `/api/refund-requests?${params.toString()}`;
}

/**
 * Hook for fetching refund requests with SWR
 */
export function useRefundRequests({
  page = 1,
  limit = 10,
  search = "",
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: RefundRequestsSwrParams & {
  fallbackData?: RefundRequestsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildRefundRequestsSwrKey({ page, limit, search, branchId });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<RefundRequestsResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData)
    );

  const refundRequests = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

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
    mutate,
  };
}
