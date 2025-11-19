"use client";

import { useState, useEffect, useCallback } from "react";
import type { PaginationMeta } from "@/lib/types";
import {
  searchPayments,
  type PaymentWithBooking,
} from "@/services/payments";

// Re-export types for backward compatibility
export type { Payment, PaginationMeta } from "@/lib/types";
export type { PaymentWithBooking } from "@/services/payments";

export function usePayments(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const fetchPayments = useCallback(
    async (
      pageNum: number = page,
      limitNum: number = limit,
      searchTerm: string = search
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const trimmedSearch = searchTerm?.trim() || null;
        const { payments: paymentsData, total } = await searchPayments(
          trimmedSearch,
          pageNum,
          limitNum
        );

        const totalPages = Math.ceil(total / limitNum);

        setPayments(paymentsData);
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
            : "Không thể tải danh sách payment";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

  useEffect(() => {
    fetchPayments(page, limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  return {
    payments,
    isLoading,
    error,
    pagination,
    fetchPayments,
  };
}
