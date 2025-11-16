"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Payment, PaginationMeta } from "@/lib/types";

// Re-export types for backward compatibility
export type { Payment, PaginationMeta } from "@/lib/types";

// Extended Payment type with booking relation
export type PaymentWithBooking = Payment & {
  bookings?: {
    id: string;
    customer_id: string | null;
    room_id: string | null;
    check_in: string;
    check_out: string;
    status: string;
    customers?: {
      id: string;
      full_name: string;
    } | null;
    rooms?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

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
        const supabase = createClient();

        // Calculate offset
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Build query with booking relation
        let query = supabase.from("payments").select(
          `
            *,
            bookings (
              id,
              customer_id,
              room_id,
              check_in,
              check_out,
              status,
              customers (
                id,
                full_name
              ),
              rooms (
                id,
                name
              )
            )
          `,
          { count: "exact" }
        );

        // Add search filter if search term exists
        // Search in payment ID and booking ID
        if (searchTerm && searchTerm.trim() !== "") {
          const trimmedSearch = searchTerm.trim();
          query = query.or(
            `id.ilike.%${trimmedSearch}%,booking_id.ilike.%${trimmedSearch}%`
          );
        }

        // Fetch data with pagination
        const {
          data,
          error: fetchError,
          count,
        } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const paymentsData = (data || []) as PaymentWithBooking[];
        const total = count || 0;
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
