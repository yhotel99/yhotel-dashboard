"use client";

import useSWR from "swr";
import type { BookingsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type BookingsSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  customerId?: string | null;
  creatorId?: string | null;
  dateField?:
    | "created_at"
    | "check_in"
    | "check_out"
    | "actual_check_out"
    | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: string;
  cursorCreatedAt?: string;
  cursorId?: string;
  branchId?: string | null;
  includeTotal?: boolean;
};

export function buildBookingsSwrKey({
  search = "",
  page = 1,
  limit = 10,
  customerId = null,
  creatorId = null,
  dateField = null,
  dateFrom = null,
  dateTo = null,
  status = "",
  cursorCreatedAt = "",
  cursorId = "",
  branchId = null,
  includeTotal = true,
}: BookingsSwrParams): string {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (customerId) {
    params.append("customerId", customerId);
  }
  if (creatorId) {
    params.append("creatorId", creatorId);
  }
  if (dateField) {
    params.append("dateField", dateField);
  }
  if (dateFrom) {
    params.append("dateFrom", dateFrom);
  }
  if (dateTo) {
    params.append("dateTo", dateTo);
  }
  if (status && status.trim() !== "") {
    params.append("status", status.trim());
  }
  if (cursorCreatedAt.trim() !== "" && cursorId.trim() !== "") {
    params.append("cursorCreatedAt", cursorCreatedAt.trim());
    params.append("cursorId", cursorId.trim());
  }
  if (branchId) {
    params.append("branchId", branchId);
  }
  if (!includeTotal) {
    params.append("includeTotal", "false");
  }
  return `/api/bookings?${params.toString()}`;
}

/**
 * Hook for fetching bookings with SWR
 */
export function useBookings({
  search = "",
  page = 1,
  limit = 10,
  customerId = null,
  creatorId = null,
  dateField = null,
  dateFrom = null,
  dateTo = null,
  status = "",
  cursorCreatedAt = "",
  cursorId = "",
  branchId = null,
  includeTotal = true,
  fallbackData,
  initialSwrKey = null,
}: BookingsSwrParams & {
  fallbackData?: BookingsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildBookingsSwrKey({
    search,
    page,
    limit,
    customerId,
    creatorId,
    dateField,
    dateFrom,
    dateTo,
    status,
    cursorCreatedAt,
    cursorId,
    branchId,
    includeTotal,
  });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<BookingsResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
    );

  return {
    bookings: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      nextCursor: null,
    },
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách booking"
      : null,
    mutate,
  };
}
