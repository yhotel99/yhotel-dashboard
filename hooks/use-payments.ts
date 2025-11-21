"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  PaymentWithBooking,
  PaginationMeta,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types";
import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants";

// Re-export types for backward compatibility
export type { PaymentWithBooking, PaginationMeta } from "@/lib/types";

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
        const supabase = createClient();

        const currentPage = pageNum ?? page;
        const currentLimit = limitNum ?? limit;
        const currentSearch = searchTerm ?? search;

        // Calculate offset
        const from = (currentPage - 1) * currentLimit;
        const to = from + currentLimit - 1;

        // Build query with bookings join
        let query = supabase.from("payments").select(
          `
            *,
            bookings:booking_id (
              customers:customer_id (
                full_name,
                phone
              ),
              rooms:room_id (
                name
              )
            )
          `,
          { count: "exact" }
        );

        // Add search filter if search term exists
        if (currentSearch && currentSearch.trim() !== "") {
          const trimmedSearch = currentSearch.trim();
          query = query.ilike("id", `%${trimmedSearch}%`);
        }

        // Fetch data with pagination
        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw new Error(error.message);
        }

        let paymentsData = (data || []) as PaymentWithBooking[];

        // Post-process to filter by booking ID, customer name, room name if search term exists
        if (currentSearch && currentSearch.trim() !== "") {
          const trimmedSearch = currentSearch.trim().toLowerCase();
          paymentsData = paymentsData.filter((payment) => {
            const paymentId = payment.id.toLowerCase();
            const bookingId = payment.booking_id.toLowerCase();
            const customerName =
              payment.bookings?.customers?.full_name?.toLowerCase() || "";
            const roomName = payment.bookings?.rooms?.name?.toLowerCase() || "";

            return (
              paymentId.includes(trimmedSearch) ||
              bookingId.includes(trimmedSearch) ||
              customerName.includes(trimmedSearch) ||
              roomName.includes(trimmedSearch)
            );
          });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / currentLimit);

        setPayments(paymentsData);
        setPagination({
          total,
          page: currentPage,
          limit: currentLimit,
          totalPages,
        });
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
        const supabase = createClient();
        const { data, error } = await supabase
          .from("payments")
          .insert({
            booking_id: input.booking_id,
            amount: input.amount,
            payment_type: input.payment_type,
            payment_method: input.payment_method || "pay_at_hotel",
            payment_status: input.payment_status || "pending",
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo payment";
        throw new Error(errorMessage);
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
        const supabase = createClient();
        const updateData: {
          payment_status: string;
          paid_at?: string | null;
        } = {
          payment_status: status,
        };

        if (status === "paid" && paidAt) {
          updateData.paid_at = paidAt;
        } else if (status !== "paid") {
          updateData.paid_at = null;
        }

        const { error } = await supabase
          .from("payments")
          .update(updateData)
          .eq("id", paymentId);

        if (error) {
          throw new Error(error.message);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái payment";
        throw new Error(errorMessage);
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
        const supabase = createClient();
        const updateData: {
          payment_status: string;
          paid_at?: string | null;
        } = {
          payment_status: status,
        };

        if (status === "paid" && paidAt) {
          updateData.paid_at = paidAt;
        } else if (status !== "paid") {
          updateData.paid_at = null;
        }

        const { error } = await supabase
          .from("payments")
          .update(updateData)
          .eq("booking_id", bookingId);

        if (error) {
          throw new Error(error.message);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái payment";
        throw new Error(errorMessage);
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
        const supabase = createClient();
        const { data, error } = await supabase
          .from("payments")
          .select("id, payment_status")
          .eq("booking_id", bookingId)
          .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          return {
            hasAdvancePayment: false,
            isPaid: false,
            paymentId: null,
          };
        }

        return {
          hasAdvancePayment: true,
          isPaid: data.payment_status === PAYMENT_STATUS.PAID,
          paymentId: data.id,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể kiểm tra trạng thái đặt cọc";
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Mark advance payment as paid
  const markAdvancePaymentAsPaid = useCallback(async (bookingId: string) => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("payments")
        .update({
          payment_status: PAYMENT_STATUS.PAID,
          paid_at: now,
        })
        .eq("booking_id", bookingId)
        .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT);

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể đánh dấu đặt cọc";
      throw new Error(errorMessage);
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
  };
}
