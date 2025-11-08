"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

import type { GalleryImage, PaginationMeta } from "@/lib/types";

// Re-export types for backward compatibility
export type { GalleryImage, PaginationMeta } from "@/lib/types";

// Hook for managing gallery images
export function useGallery(page: number = 1, limit: number = 20) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Fetch images with pagination
  const fetchImages = useCallback(
    async (pageNum: number = page, limitNum: number = limit) => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        // Calculate offset
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Fetch data with pagination from images table
        const { data, error, count } = await supabase
          .from("images")
          .select("id, url, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw error;
        }

        const imagesData = (data || []) as GalleryImage[];
        const total = count || 0;
        const totalPages = Math.ceil(total / limitNum);

        setImages(imagesData);
        setPagination({
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách hình ảnh";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit]
  );

  // Load images on mount or when page/limit changes
  useEffect(() => {
    fetchImages(page, limit);
  }, [page, limit, fetchImages]);

  // Add images
  const addImages = useCallback(
    async (urls: string[]) => {
      try {
        const supabase = createClient();

        // Prepare data for insertion
        const imagesToInsert = urls.map((url) => ({
          url,
          created_at: new Date().toISOString(),
        }));

        // Insert into Supabase images table
        const { error: insertError } = await supabase
          .from("images")
          .insert(imagesToInsert);

        if (insertError) {
          throw insertError;
        }

        // Refetch to update pagination and show new images
        await fetchImages(1, limit);
      } catch (err) {
        throw err;
      }
    },
    [fetchImages, limit]
  );

  // Delete image
  const deleteImage = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient();

        // Delete from Supabase images table
        const { error: deleteError } = await supabase
          .from("images")
          .delete()
          .eq("id", id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        // Refetch current page
        await fetchImages(page, limit);
      } catch (err) {
        throw err;
      }
    },
    [fetchImages, page, limit]
  );

  return {
    images,
    isLoading,
    error,
    pagination,
    fetchImages,
    addImages,
    deleteImage,
  };
}
