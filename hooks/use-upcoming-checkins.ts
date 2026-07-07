"use client";

import useSWR from "swr";
import type { BookingsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type UpcomingCheckinsSwrParams = {
  search?: string;
  branchId?: string | null;
  limit?: number;
};

export function buildUpcomingCheckinsSwrKey({
  search = "",
  branchId = null,
  limit = 100,
}: UpcomingCheckinsSwrParams): string {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (branchId) {
    params.append("branchId", branchId);
  }
  return `/api/upcoming-checkins?${params.toString()}`;
}

/**
 * Hook for fetching upcoming check-ins with SWR
 */
export function useUpcomingCheckins({
  search = "",
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: {
  search?: string;
  branchId?: string | null;
  fallbackData?: BookingsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildUpcomingCheckinsSwrKey({ search, branchId });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<BookingsResponse>(swrKey, fetcher, {
      ...listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId),
      refreshInterval: 30000,
    });

  return {
    bookings: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    },
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách phòng sắp nhận"
      : null,
    refetch: mutate,
    mutate,
  };
}
