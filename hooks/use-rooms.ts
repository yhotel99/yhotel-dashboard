"use client";

import useSWR from "swr";
import type { RoomsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type RoomsSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string | null;
};

export function buildRoomsSwrKey({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
}: RoomsSwrParams): string {
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
  return `/api/rooms?${params.toString()}`;
}

/**
 * Hook for fetching rooms with SWR
 */
export function useRooms({
  search = "",
  page = 1,
  limit = 10,
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: RoomsSwrParams & {
  fallbackData?: RoomsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildRoomsSwrKey({ search, page, limit, branchId });

  const { data, error, isLoading, mutate, isValidating } = useSWR<RoomsResponse>(
    swrKey,
    fetcher,
    listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
  );

  return {
    rooms: data?.data || [],
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
        : "Không thể tải danh sách phòng"
      : null,
    mutate,
  };
}
