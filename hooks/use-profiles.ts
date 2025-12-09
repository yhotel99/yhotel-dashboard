"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Profile, PaginationMeta } from "@/lib/types";

// Type for API response
type ProfilesResponse = {
  data: Profile[];
  pagination: PaginationMeta;
};

/**
 * Hook for fetching profiles with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useProfiles(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  // Use SWR to fetch profiles
  const { data, error, isLoading, mutate } = useSWR<ProfilesResponse>(
    `/api/profiles?${params.toString()}`,
    fetcher
  );

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
    isLoading,
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
