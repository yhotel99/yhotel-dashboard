"use client";

import useSWR from "swr";
import type { PaymentLogsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type PaymentLogsSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string | null;
};

export function buildPaymentLogsSwrKey({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
}: PaymentLogsSwrParams): string {
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
  return `/api/payment-logs?${params.toString()}`;
}

/**
 * Hook for fetching payment logs with SWR
 */
export function usePaymentLogs({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: PaymentLogsSwrParams & {
  fallbackData?: PaymentLogsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildPaymentLogsSwrKey({ search, page, limit, branchId });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<PaymentLogsResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
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
    mutate,
  };
}
