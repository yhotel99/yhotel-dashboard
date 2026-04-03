"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { GalleryImagesResponse, PaginationMeta } from "@/lib/types";



/**
 * Hook for fetching gallery images with SWR
 * @param page - Page number
 * @param limit - Items per page
 */
export function useGallery(page: number = 1, limit: number = 24) {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  // Use SWR to fetch gallery images
  const { data, error, isLoading, mutate, isValidating } =
    useSWR<GalleryImagesResponse>(`/api/gallery?${params.toString()}`, fetcher);

  const images = data?.data || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 24,
    totalPages: 0,
  };

  // Refetch images
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    images,
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách hình ảnh"
      : null,
    pagination,
    refetch,
    mutate, // dùng để refresh sau khi CRUD
  };
}
