"use client";

import useSWR from "swr";
import type { VouchersResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type VouchersSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string | null;
};

export function buildVouchersSwrKey({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
}: VouchersSwrParams): string {
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
  return `/api/vouchers?${params.toString()}`;
}

export function useVouchers({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: VouchersSwrParams & {
  fallbackData?: VouchersResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildVouchersSwrKey({ search, page, limit, branchId });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<VouchersResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData)
    );

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
