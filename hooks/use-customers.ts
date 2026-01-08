"use client";

import useSWR, { SWRConfiguration } from "swr";
import type { CustomersResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";



/**
 * Hook for fetching customers with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @param fallbackData - Fallback data
 */
export function useCustomers({
  search = "",
  page = 1,
  limit = 10,
  fallbackData,
}: {
  search?: string;
  page?: number;
  limit?: number;
  fallbackData?: CustomersResponse;
}) {
  const config: SWRConfiguration<CustomersResponse> = {
  }
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  if(fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<CustomersResponse>(`/api/customers?${params.toString()}`, fetcher, config);

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
    mutate, // dùng để refresh sau khi CRUD
  };
}
