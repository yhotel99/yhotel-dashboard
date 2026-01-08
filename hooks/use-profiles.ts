"use client";

import { useCallback } from "react";
import useSWR, { SWRConfiguration } from "swr";
import { fetcher } from "@/lib/fetcher";
import type {  PaginationMeta, ProfilesResponse } from "@/lib/types";


/**
 * Hook for fetching profiles with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useProfiles(
  {
    page = 1,
    limit = 10,
    search = "",
    fallbackData,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    fallbackData?: ProfilesResponse;
  }
) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const config: SWRConfiguration<ProfilesResponse> = {
  }
  if(fallbackData) {
    config.revalidateOnMount = false;
    config.fallbackData = fallbackData;
  }

  // Use SWR to fetch profiles
  const { data, error, isLoading, mutate, isValidating } =
    useSWR<ProfilesResponse>(`/api/profiles?${params.toString()}`, fetcher, config);

  const profiles = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Refetch profiles
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
    mutate, // dùng để refresh sau khi CRUD
  };
}
