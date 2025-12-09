"use client";

import useSWR from "swr";
import type { Customer, PaginationMeta } from "@/lib/types";

// Type for API response
type CustomersResponse = {
  data: Customer[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
const fetcher = (url: string): Promise<CustomersResponse> =>
  fetch(url).then((r) => {
    if (!r.ok) {
      return r.json().then((err) => {
        throw new Error(err.error || "Không thể tải danh sách khách hàng");
      });
    }
    return r.json();
  });

/**
 * Hook for fetching customers with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 */
export function useCustomers({
  search = "",
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const { data, error, isLoading, mutate } = useSWR<CustomersResponse>(
    `/api/customers?${params.toString()}`,
    fetcher
  );

  return {
    customers: data?.data || [],
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
        : "Không thể tải danh sách khách hàng"
      : null,
    mutate, // dùng để refresh sau khi CRUD
  };
}
