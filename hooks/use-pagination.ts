"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

export interface UsePaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  defaultSearch?: string;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  search: string;
  debouncedSearch: string;
  localSearch: string;
  setLocalSearch: (value: string) => void;
  updateSearchParams: (
    newPage: number,
    newLimit: number,
    newSearch: string
  ) => void;
}

/**
 * Hook to manage pagination and search from URL search params
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { defaultPage = 1, defaultLimit = 10, defaultSearch = "" } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get page, limit, and search from URL search params
  const page = useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : defaultPage;
    return pageNum > 0 ? pageNum : defaultPage;
  }, [searchParams, defaultPage]);

  const limit = useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : defaultLimit;
    return limitNum > 0 ? limitNum : defaultLimit;
  }, [searchParams, defaultLimit]);

  const search = useMemo(() => {
    return searchParams.get("search") || defaultSearch;
  }, [searchParams, defaultSearch]);

  // Local search state for debouncing
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync localSearch with URL search param
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Update search params in URL
  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newPage > defaultPage) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }

      if (newLimit !== defaultLimit) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }

      if (newSearch && newSearch.trim() !== "") {
        params.set("search", newSearch.trim());
      } else {
        params.delete("search");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname, defaultPage, defaultLimit]
  );

  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(page, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, page, limit, updateSearchParams]);

  return {
    page,
    limit,
    search,
    debouncedSearch,
    localSearch,
    setLocalSearch,
    updateSearchParams,
  };
}
