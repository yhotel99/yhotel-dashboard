"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type { GalleryImage, PaginationMeta } from "@/lib/types";
import {
  searchGalleryImages,
  addGalleryImages,
  deleteGalleryImage,
} from "@/services/gallery";

// Type for SWR data
type GalleryData = {
  images: GalleryImage[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function galleryFetcher(key: string): Promise<GalleryData> {
  const [, page, limit] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  const { data, pagination } = await searchGalleryImages({
    page: pageNum,
    limit: limitNum,
  });

  return {
    images: data,
    pagination,
  };
}

/**
 * Hook for managing gallery images with SWR
 * @param page - Page number
 * @param limit - Items per page
 */
export function useGalleryQuery(page: number = 1, limit: number = 20) {
  // Create SWR key from params
  const swrKey = useMemo(
    () => `gallery:${page}:${limit}`,
    [page, limit]
  );

  // Use SWR to fetch gallery images
  const { data, error, isLoading, mutate } = useSWR<GalleryData>(
    swrKey,
    galleryFetcher
  );

  const images = data?.images || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  // Add images
  const addImages = useCallback(
    async (urls: string[]) => {
      try {
        const newImages = await addGalleryImages(urls);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;

          // If we're on page 1, prepend new images
          if (page === 1) {
            return {
              ...current,
              images: [...newImages, ...current.images],
              pagination: {
                ...current.pagination,
                total: current.pagination.total + newImages.length,
              },
            };
          }

          // Otherwise, just update total count
          return {
            ...current,
            pagination: {
              ...current.pagination,
              total: current.pagination.total + newImages.length,
            },
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();

        return newImages;
      } catch (err) {
        throw err;
      }
    },
    [mutate, page]
  );

  // Delete image
  const deleteImage = useCallback(
    async (id: string) => {
      try {
        await deleteGalleryImage(id);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;

          const filteredImages = current.images.filter(
            (image) => image.id !== id
          );

          return {
            ...current,
            images: filteredImages,
            pagination: {
              ...current.pagination,
              total: Math.max(0, current.pagination.total - 1),
            },
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Refetch images
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    images,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách hình ảnh"
      : null,
    pagination,
    addImages,
    deleteImage,
    refetch,
    mutate,
  };
}

