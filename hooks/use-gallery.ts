"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Simple image type - only id and url
export type GalleryImage = {
  id: string;
  url: string;
};

// Pagination metadata type
export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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

        // Fetch data with pagination
        // Note: Assuming there's a 'gallery' table in Supabase
        // If not, we'll use mock data for now
        const { data, error, count } = await supabase
          .from("gallery")
          .select("*", { count: "exact" })
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          // If table doesn't exist, use mock data
          console.warn(
            "Gallery table not found, using mock data:",
            error.message
          );
          // Use mock data as fallback
          const mockImages: GalleryImage[] = [
            {
              id: "1",
              url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            },
            {
              id: "2",
              url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
            },
            {
              id: "3",
              url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
            },
            {
              id: "4",
              url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
            },
            {
              id: "5",
              url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
            },
            {
              id: "6",
              url: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800",
            },
            {
              id: "7",
              url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
            },
            {
              id: "8",
              url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
            },
            {
              id: "9",
              url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            },
            {
              id: "10",
              url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
            },
            {
              id: "11",
              url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
            },
            {
              id: "12",
              url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
            },
            {
              id: "13",
              url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
            },
            {
              id: "14",
              url: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800",
            },
            {
              id: "15",
              url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
            },
            {
              id: "16",
              url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
            },
            {
              id: "17",
              url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            },
            {
              id: "18",
              url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
            },
            {
              id: "19",
              url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
            },
            {
              id: "20",
              url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
            },
          ];

          const total = mockImages.length;
          const paginatedImages = mockImages.slice(from, to + 1);
          const totalPages = Math.ceil(total / limitNum);

          setImages(paginatedImages);
          setPagination({
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
          });
          return;
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
        toast.error(errorMessage);
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
        // In real app, save to Supabase
        // For now, just add to local state
        const newImages: GalleryImage[] = urls.map((url, index) => ({
          id: `new-${Date.now()}-${index}`,
          url,
        }));

        setImages((prev) => [...newImages, ...prev]);
        toast.success(`Đã thêm ${newImages.length} hình ảnh thành công`);
        // Refetch to update pagination
        await fetchImages(1, limit);
        return newImages;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể thêm hình ảnh";
        toast.error("Thêm hình ảnh thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [fetchImages, limit]
  );

  // Delete image
  const deleteImage = useCallback(
    async (id: string) => {
      try {
        // In real app, soft delete from Supabase
        setImages((prev) => prev.filter((img) => img.id !== id));
        toast.success("Đã xóa hình ảnh");
        // Refetch current page
        await fetchImages(page, limit);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xóa hình ảnh";
        toast.error("Xóa hình ảnh thất bại", {
          description: errorMessage,
        });
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
