"use client";

import useSWR from "swr";
import type { Settings } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

export function useSettings() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<Settings>(
    "/api/settings",
    fetcher
  );

  return {
    settings: data ?? null,
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải cài đặt"
      : null,
    mutate,
  };
}

