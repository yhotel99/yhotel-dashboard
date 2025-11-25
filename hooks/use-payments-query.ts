"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { Payment } from "@/lib/types";
import { getPaymentsByBookingId } from "@/services/payments";

/**
 * Fetcher function for SWR
 */
async function paymentsByBookingIdFetcher(key: string): Promise<Payment[]> {
  const [, bookingId] = key.split(":");
  return await getPaymentsByBookingId(bookingId);
}

/**
 * Hook for fetching payments by booking ID with SWR
 * @param bookingId - Booking ID (null to disable fetching)
 * @param options - SWR options
 */
export function usePaymentsByBookingIdQuery(
  bookingId: string | null,
  options?: {
    enabled?: boolean;
  }
) {
  // Create SWR key from bookingId
  const swrKey = useMemo(() => {
    if (!bookingId || options?.enabled === false) {
      return null;
    }
    return `payments-by-booking:${bookingId}`;
  }, [bookingId, options?.enabled]);

  // Use SWR to fetch payments
  const { data, error, isLoading, mutate } = useSWR<Payment[]>(
    swrKey,
    paymentsByBookingIdFetcher
  );

  const payments = data || [];

  return {
    payments,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách thanh toán"
      : null,
    refetch: mutate,
    mutate,
  };
}
