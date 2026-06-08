"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { ReservationsResponse } from "@/lib/types";

export function useReservation(branchId: string | null = null) {
  const params = new URLSearchParams();
  if (branchId) {
    params.set("branchId", branchId);
  }
  const query = params.toString();
  const swrKey = query ? `/api/reservations?${query}` : "/api/reservations";

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<ReservationsResponse>(swrKey, fetcher);

  const rooms = data?.data || [];
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Không thể tải sơ đồ phòng"
    : null;

  return {
    rooms,
    isLoading: isLoading || isValidating,
    error: errorMessage,
    refetch: mutate,
    mutate,
  };
}
