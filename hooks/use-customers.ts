"use client";

import useSWR from "swr";
import type { CustomersResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type CustomersSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string | null;
};

export function buildCustomersSwrKey({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
}: CustomersSwrParams): string {
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
  return `/api/customers?${params.toString()}`;
}

export function useCustomers({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: CustomersSwrParams & {
  fallbackData?: CustomersResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildCustomersSwrKey({ search, page, limit, branchId });

  const { data, error, isLoading, mutate, isValidating } = useSWR<CustomersResponse>(
    swrKey,
    fetcher,
    listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
  );

  return {
    customers: data?.data || [],
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
        : "Không thể tải danh sách khách hàng"
      : null,
    mutate,
  };
}
