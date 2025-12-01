"use client";

import { useState, useCallback } from "react";
import {
  searchPayments,
  createPayment as createPaymentService,
  updatePaymentStatus as updatePaymentStatusService,
  updatePaymentStatusByBookingId as updatePaymentStatusByBookingIdService,
  checkAdvancePaymentStatus as checkAdvancePaymentStatusService,
  markAdvancePaymentAsPaid as markAdvancePaymentAsPaidService,
  getPaymentsByBookingId as getPaymentsByBookingIdService,
} from "@/services/payments";
import type {
  PaymentWithBooking,
  PaginationMeta,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types";

// Hook for managing payments
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

  // Fetch payments with pagination and search
  const fetchPayments = useCallback(
    async (pageNum?: number, limitNum?: number, searchTerm?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const currentPage = pageNum ?? page;
        const currentLimit = limitNum ?? limit;
        const currentSearch = searchTerm ?? search;

        const { data, pagination: paginationData } = await searchPayments({
          search: currentSearch || null,
          page: currentPage,
          limit: currentLimit,
        });

        setPayments(data);
        setPagination(paginationData);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách thanh toán";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

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
        return await createPaymentService(input);
      } catch (err) {
        throw err;
      }
    },
    []
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
      } catch (err) {
        throw err;
      }
    },
    []
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
      } catch (err) {
        throw err;
      }
    },
    []
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
  const markAdvancePaymentAsPaid = useCallback(async (bookingId: string) => {
    try {
      await markAdvancePaymentAsPaidService(bookingId);
    } catch (err) {
      throw err;
    }
  }, []);

  // Get payments by booking ID
  const getPaymentsByBookingId = useCallback(async (bookingId: string) => {
    try {
      return await getPaymentsByBookingIdService(bookingId);
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    payments,
    isLoading,
    error,
    pagination,
    fetchPayments,
    createPayment,
    updatePaymentStatus,
    updatePaymentStatusByBookingId,
    checkAdvancePaymentStatus,
    markAdvancePaymentAsPaid,
    getPaymentsByBookingId,
  };
}
