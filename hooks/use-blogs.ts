"use client";

import useSWR from "swr";
import type { Blog, BlogsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";



/**
 * Hook for fetching blogs with SWR
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 */
export function useBlogs({
  search = "",
  page = 1,
  limit = 10,
  fallbackData,
}: {
  search?: string;
  page?: number;
  limit?: number;
  fallbackData?: BlogsResponse;
}) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<BlogsResponse>(`/api/blogs?${params.toString()}`, fetcher, {
      fallbackData: fallbackData,
      revalidateOnMount: true,
    });

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
    mutate, // dùng để refresh sau khi CRUD
  };
}
