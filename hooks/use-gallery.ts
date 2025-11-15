"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GalleryImage, PaginationMeta } from "@/lib/types";
import {
  galleryKeys,
  fetchGalleryImagesQuery,
  addImagesMutation,
  deleteImageMutation,
} from "@/lib/queries/gallery";

// Re-export types for backward compatibility
export type { GalleryImage, PaginationMeta } from "@/lib/types";

// Hook for managing gallery images
export function useGallery(page: number = 1, limit: number = 20) {
  const queryClient = useQueryClient();

  // Fetch images with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: galleryKeys.list(page, limit),
    queryFn: () => fetchGalleryImagesQuery(page, limit),
  });

  const images = data?.images || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  // Add images mutation
  const addImagesMutationHook = useMutation({
    mutationFn: addImagesMutation,
    onSuccess: () => {
      // Invalidate and refetch, go to page 1 to show new images
      queryClient.invalidateQueries({ queryKey: galleryKeys.lists() });
    },
  });

  // Delete image mutation
  const deleteImageMutationHook = useMutation({
    mutationFn: deleteImageMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.lists() });
    },
  });

  return {
    images,
    isLoading,
    error: error ? (error as Error).message : null,
    pagination,
    fetchImages: async () => {
      await refetch();
    },
    addImages: async (urls: string[]) => {
      await addImagesMutationHook.mutateAsync(urls);
      // Refetch page 1 to show new images
      await queryClient.invalidateQueries({
        queryKey: galleryKeys.list(1, limit),
      });
    },
    deleteImage: async (id: string) => {
      return deleteImageMutationHook.mutateAsync(id);
    },
  };
}
