"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useCallback, useState, useEffect } from "react";
import { useDebounce } from "./use-debounce";

interface UsePaginationSearchParamsOptions {
  defaultPage?: number;
  defaultLimit?: number;
  defaultSearch?: string;
  debounceDelay?: number;
}

export function usePaginationSearchParams(
  options: UsePaginationSearchParamsOptions = {}
) {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    defaultSearch = "",
    debounceDelay = 500,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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

  // Update URL search params
  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }
      
      if (newLimit !== defaultLimit) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }
      
      if (newSearch !== undefined) {
        if (newSearch.trim() !== "") {
          params.set("search", newSearch.trim());
        } else {
          params.delete("search");
        }
      }
      
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, searchParams, pathname, defaultLimit]
  );

  // Local search state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search value - update URL after user stops typing
  const debouncedSearch = useDebounce(localSearch, debounceDelay);

  // Sync local search with URL search param when it changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(defaultPage, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams, defaultPage]);

  return {
    page,
    limit,
    search,
    localSearch,
    debouncedSearch,
    setLocalSearch,
    updateSearchParams,
  };
}

