"use client";

import useSWR from "swr";
import type { PaymentsResponse } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { listSwrConfig } from "@/lib/list-swr";

export type PaymentsSwrParams = {
  search?: string;
  page?: number;
  limit?: number;
  bookingId?: string | null;
  paymentStatus?: string | null;
  paymentType?: string | null;
  dateField?: "created_at" | "paid_at";
  dateFrom?: string | null;
  dateTo?: string | null;
  branchId?: string | null;
};

export function buildPaymentsSwrKey({
  search = "",
  page = 1,
  limit = 10,
  bookingId = null,
  paymentStatus = null,
  paymentType = null,
  dateField = "created_at",
  dateFrom = null,
  dateTo = null,
  branchId = null,
}: PaymentsSwrParams): string {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  if (bookingId) {
    params.append("bookingId", bookingId);
  }
  if (paymentStatus) {
    params.append("paymentStatus", paymentStatus);
  }
  if (paymentType) {
    params.append("paymentType", paymentType);
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
  if (branchId) {
    params.append("branchId", branchId);
  }
  return `/api/payments?${params.toString()}`;
}

/**
 * Hook for fetching payments with SWR
 */
export function usePayments({
  search = "",
  page = 1,
  limit = 10,
  bookingId = null,
  paymentStatus = null,
  paymentType = null,
  dateField = "created_at",
  dateFrom = null,
  dateTo = null,
  branchId = null,
  fallbackData,
  initialSwrKey = null,
}: PaymentsSwrParams & {
  fallbackData?: PaymentsResponse;
  initialSwrKey?: string | null;
}) {
  const swrKey = buildPaymentsSwrKey({
    search,
    page,
    limit,
    bookingId,
    paymentStatus,
    paymentType,
    dateField,
    dateFrom,
    dateTo,
    branchId,
  });

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<PaymentsResponse>(
      swrKey,
      fetcher,
      listSwrConfig(swrKey, initialSwrKey, fallbackData, branchId)
    );

  return {
    payments: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
    isLoading: isLoading || isValidating,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách thanh toán"
      : null,
    mutate,
  };
}
