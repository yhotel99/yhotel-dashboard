"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { PaginationMeta, ProfilesResponse } from "@/lib/types";
import { listSwrConfig } from "@/lib/list-swr";

export type ProfilesSwrParams = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | null;
};

export function buildProfilesSwrKey({
  page = 1,
  limit = 10,
  search = "",
  branchId = null,
}: ProfilesSwrParams): string {
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
  return `/api/profiles?${params.toString()}`;
}

export function useProfiles({
  page = 1,
  limit = 10,
  search = "",
  branchId = null,
  enabled = true,
  fallbackData,
  initialSwrKey = null,
}: ProfilesSwrParams & {
  enabled?: boolean;
  fallbackData?: ProfilesResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = enabled
    ? buildProfilesSwrKey({ page, limit, search, branchId })
    : null;

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<ProfilesResponse>(
      swrKey,
      fetcher,
      swrKey
        ? listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
        : undefined
    );

  const profiles = data?.data || [];
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
    profiles,
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách người dùng"
      : null,
    pagination,
    refetch,
    mutate,
  };
}
