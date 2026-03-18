"use client";

import useSWR, { type SWRConfiguration } from "swr";
import type { VouchersResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

export function useVouchers({
  search = "",
  page = 1,
  limit = 10,
  fallbackData,
}: {
  search?: string;
  page?: number;
  limit?: number;
  fallbackData?: VouchersResponse;
}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const config: SWRConfiguration<VouchersResponse> = {};
  if (fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<VouchersResponse>(`/api/vouchers?${params.toString()}`, fetcher, config);

  return {
    vouchers: data?.data || [],
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
        : "Không thể tải danh sách voucher"
      : null,
    mutate,
  };
}

