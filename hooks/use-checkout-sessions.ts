"use client";

import useSWR from "swr";
import type { CheckoutSessionsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";
import { CHECKOUT_SESSION_STATUS } from "@/lib/constants";

export type CheckoutSessionsSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  status?: string | null;
  branchId?: string | null;
};

export function buildCheckoutSessionsSwrKey({
  search = "",
  page = 1,
  limit = 10,
  status = CHECKOUT_SESSION_STATUS.NEEDS_ACTION,
  branchId = null,
}: CheckoutSessionsSwrParams): string {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (status && status.trim() !== "") {
    params.append("status", status.trim());
  }
  if (branchId) {
    params.append("branchId", branchId);
  }
  return `/api/checkout-sessions?${params.toString()}`;
}

export function useCheckoutSessions({
  search = "",
  page = 1,
  limit = 10,
  status = CHECKOUT_SESSION_STATUS.NEEDS_ACTION,
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: CheckoutSessionsSwrParams & {
  fallbackData?: CheckoutSessionsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildCheckoutSessionsSwrKey({
    search,
    page,
    limit,
    status,
    branchId,
  });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<CheckoutSessionsResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
    );

  return {
    sessions: data?.data || [],
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
        : "Không thể tải danh sách phiên thanh toán"
      : null,
    mutate,
  };
}
