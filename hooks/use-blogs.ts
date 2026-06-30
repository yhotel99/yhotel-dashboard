"use client";

import useSWR from "swr";
import type { BlogsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type BlogsSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
};

export function buildBlogsSwrKey({
  search = "",
  page = 1,
  limit = 10,
}: BlogsSwrParams): string {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  return `/api/blogs?${params.toString()}`;
}

/**
 * Hook for fetching blogs with SWR
 */
export function useBlogs({
  search = "",
  page = 1,
  limit = 10,
  fallbackData,
  initialSwrKey = null,
}: BlogsSwrParams & {
  fallbackData?: BlogsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildBlogsSwrKey({ search, page, limit });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<BlogsResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData)
    );

  return {
    blogs: data?.data || [],
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
        : "Không thể tải danh sách blog"
      : null,
    mutate,
  };
}
