"use client";

import { useEffect } from "react";
import type { PaginationMeta } from "@/lib/types";

export interface UseEmptyPageHandlerOptions {
  isLoading: boolean;
  pagination: PaginationMeta;
  currentPage: number;
  itemsCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Hook to handle empty page scenarios:
 * - Navigate to last page if current page is beyond total pages
 * - Navigate to previous page if current page is empty after deletion
 */
export function useEmptyPageHandler({
  isLoading,
  pagination,
  currentPage,
  itemsCount,
  onPageChange,
}: UseEmptyPageHandlerOptions) {
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (currentPage > pagination.totalPages) {
        onPageChange(pagination.totalPages);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (itemsCount === 0 && currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    }
  }, [isLoading, pagination.totalPages, currentPage, itemsCount, onPageChange]);
}
