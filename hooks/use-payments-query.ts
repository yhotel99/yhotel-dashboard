"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type {
  PaymentWithBooking,
  PaginationMeta,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types";
import {
  searchPayments,
  createPayment as createPaymentService,
  updatePaymentStatus as updatePaymentStatusService,
  updatePaymentStatusByBookingId as updatePaymentStatusByBookingIdService,
  checkAdvancePaymentStatus as checkAdvancePaymentStatusService,
  markAdvancePaymentAsPaid as markAdvancePaymentAsPaidService,
  getPaymentsByBookingId,
} from "@/services/payments";

// Type for SWR data
type PaymentsData = {
  payments: PaymentWithBooking[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function paymentsFetcher(key: string): Promise<PaymentsData> {
  const [, page, limit, search] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;

  const { data, pagination } = await searchPayments({
    search: trimmedSearch,
    page: pageNum,
    limit: limitNum,
  });

  return {
    payments: data,
    pagination,
  };
}

/**
 * Fetcher function for payments by booking ID
 */
async function paymentsByBookingIdFetcher(
  key: string
): Promise<PaymentWithBooking[]> {
  const [, bookingId] = key.split(":");
  return await getPaymentsByBookingId(bookingId);
}

/**
 * Hook for managing payments with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 * @param enabled - Whether to enable fetching (default: true)
 */
export function usePaymentsQuery(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  enabled: boolean = true
) {
  // Create SWR key from params
  const swrKey = useMemo(() => {
    if (!enabled) return null;
    return `payments:${page}:${limit}:${search?.trim() || "null"}`;
  }, [page, limit, search, enabled]);

  // Use SWR to fetch payments
  const { data, error, isLoading, mutate } = useSWR<PaymentsData>(
    swrKey,
    paymentsFetcher
  );

  const payments = data?.payments || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create payment
  const createPayment = useCallback(
    async (input: {
      booking_id: string;
      amount: number;
      payment_type: PaymentType;
      payment_method?: PaymentMethod;
      payment_status?: PaymentStatus;
    }) => {
      try {
        const newPayment = await createPaymentService(input);

        // Revalidate SWR cache
        await mutate();
        return newPayment;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update payment status
  const updatePaymentStatus = useCallback(
    async (
      paymentId: string,
      status: PaymentStatus,
      paidAt?: string | null
    ) => {
      try {
        await updatePaymentStatusService(paymentId, status, paidAt);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            payments: current.payments.map((payment) => {
              if (payment.id === paymentId) {
                return {
                  ...payment,
                  payment_status: status,
                  paid_at: status === "paid" && paidAt ? paidAt : null,
                };
              }
              return payment;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update payment status by booking ID
  const updatePaymentStatusByBookingId = useCallback(
    async (
      bookingId: string,
      status: PaymentStatus,
      paidAt?: string | null
    ) => {
      try {
        await updatePaymentStatusByBookingIdService(bookingId, status, paidAt);

        // Revalidate SWR cache
        await mutate();
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Check advance payment status by booking ID
  const checkAdvancePaymentStatus = useCallback(
    async (
      bookingId: string
    ): Promise<{
      hasAdvancePayment: boolean;
      isPaid: boolean;
      paymentId: string | null;
    }> => {
      try {
        return await checkAdvancePaymentStatusService(bookingId);
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Mark advance payment as paid
  const markAdvancePaymentAsPaid = useCallback(
    async (bookingId: string) => {
      try {
        await markAdvancePaymentAsPaidService(bookingId);

        // Revalidate SWR cache
        await mutate();
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Refetch payments
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    payments,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách thanh toán"
      : null,
    pagination,
    createPayment,
    updatePaymentStatus,
    updatePaymentStatusByBookingId,
    checkAdvancePaymentStatus,
    markAdvancePaymentAsPaid,
    refetch,
    mutate,
  };
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
  const { data, error, isLoading, mutate } = useSWR<PaymentWithBooking[]>(
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
