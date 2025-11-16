"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingRecord, BookingInput, PaginationMeta } from "@/lib/types";
import {
  createPayment,
  getPaymentByBookingId,
  updatePaymentStatus,
} from "@/services/payments";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/constants";

// Re-export types for backward compatibility
export type {
  BookingRecord,
  BookingInput,
  BookingStatus,
  PaginationMeta,
} from "@/lib/types";

export function useBookings(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const fetchBookings = useCallback(
    async (
      pageNum: number = page,
      limitNum: number = limit,
      searchTerm: string = search
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        const trimmedSearch = searchTerm?.trim() || null;

        // Call both RPC functions in parallel for better performance
        const [bookingsResult, countResult] = await Promise.all([
          supabase.rpc("search_bookings", {
            p_search: trimmedSearch,
            p_page: pageNum,
            p_limit: limitNum,
          }),
          supabase.rpc("count_bookings", {
            p_search: trimmedSearch,
          }),
        ]);

        if (bookingsResult.error) {
          throw new Error(bookingsResult.error.message);
        }

        if (countResult.error) {
          throw new Error(countResult.error.message);
        }

        const bookingsData = (bookingsResult.data || []) as BookingRecord[];

        const total = (countResult.data as number) || 0;
        const totalPages = Math.ceil(total / limitNum);

        setBookings(bookingsData);
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
            : "Không thể tải danh sách booking";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

  useEffect(() => {
    fetchBookings(page, limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  // Helper function to find conflicting booking
  const findConflictingBooking = useCallback(
    async (
      roomId: string | null,
      checkIn: string,
      checkOut: string
    ): Promise<BookingRecord | null> => {
      if (!roomId) return null;

      try {
        const supabase = createClient();
        // Query bookings that overlap with the given time range
        // Only check active bookings: pending, awaiting_payment, confirmed, checked_in
        // Overlap condition: (check_in < p_check_out) AND (check_out > p_check_in)
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("room_id", roomId)
          .in("status", [
            "pending",
            "awaiting_payment",
            "confirmed",
            "checked_in",
          ])
          .is("deleted_at", null)
          .lt("check_in", checkOut)
          .gt("check_out", checkIn)
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          return null;
        }

        return data as BookingRecord;
      } catch {
        return null;
      }
    },
    []
  );

  const createBooking = useCallback(
    async (input: BookingInput) => {
      try {
        const supabase = createClient();

        // Gọi RPC function để tạo booking (atomic, tránh race condition)
        // Thứ tự tham số theo function SQL definition
        const { data: bookingId, error: rpcError } = await supabase.rpc(
          "create_booking_secure",
          {
            p_customer_id: input.customer_id || null,
            p_room_id: input.room_id || null,
            p_check_in: input.check_in, // TIMESTAMPTZ
            p_check_out: input.check_out, // TIMESTAMPTZ
            p_number_of_nights: input.number_of_nights || 0,
            p_total_amount: input.total_amount,
            p_total_guests: input.total_guests ?? 1,
            p_notes: input.notes || null,
            p_advance_payment: input.advance_payment ?? 0,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!bookingId) {
          throw new Error("Không thể tạo booking");
        }

        // Fetch lại booking vừa tạo với đầy đủ relations
        const { data: bookingData, error: fetchError } = await supabase
          .from("bookings")
          .select(
            `
            *,
            customers (
              id,
              full_name
            ),
            rooms (
              id,
              name
            )
            `
          )
          .eq("id", bookingId)
          .single();

        if (fetchError || !bookingData) {
          // Nếu không fetch được, vẫn refresh danh sách
          await fetchBookings(page, limit, search);
          throw new Error(
            fetchError?.message || "Không thể lấy thông tin booking vừa tạo"
          );
        }

        const newBooking = bookingData as BookingRecord;
        await fetchBookings(page, limit, search);
        return newBooking;
      } catch (err) {
        throw err;
      }
    },
    [fetchBookings, page, limit, search]
  );

  const updateBooking = useCallback(
    async (id: string, input: Partial<BookingInput>) => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .update(input)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const updatedBooking = data as BookingRecord;

        // Cập nhật state thay vì fetch lại, giữ nguyên relations nếu response không có
        setBookings((prevBookings) =>
          prevBookings.map((booking) => {
            if (booking.id === id) {
              // Nếu response không có relations, giữ nguyên từ booking cũ
              return {
                ...updatedBooking,
                customers: updatedBooking.customers ?? booking.customers,
                rooms: updatedBooking.rooms ?? booking.rooms,
              };
            }
            return booking;
          })
        );

        return updatedBooking;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const updateBookingNotes = useCallback(
    async (id: string, notes: string | null): Promise<BookingRecord> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .update({ notes })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const updatedBooking = data as BookingRecord;

        // Cập nhật state trực tiếp, giữ nguyên relations nếu response không có
        setBookings((prevBookings) =>
          prevBookings.map((booking) => {
            if (booking.id === id) {
              return {
                ...updatedBooking,
                customers: updatedBooking.customers ?? booking.customers,
                rooms: updatedBooking.rooms ?? booking.rooms,
              };
            }
            return booking;
          })
        );

        return updatedBooking;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // A. Rollback awaiting_payment → pending
  const rollbackToPending = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();

      // Update booking status to pending
      const { error } = await supabase
        .from("bookings")
        .update({ status: BOOKING_STATUS.PENDING })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      // Check payment status - only update if payment is pending (not paid or refunded)
      const payment = await getPaymentByBookingId(id);
      if (payment && payment.payment_status === PAYMENT_STATUS.PENDING) {
        // Only update payment to failed if it's still pending
        // updatePaymentStatus will prevent changes if already refunded
        await updatePaymentStatus(payment.id, PAYMENT_STATUS.FAILED);
      }
      // If payment is already paid or refunded, keep it as is (no change)

      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === id ? { ...b, status: BOOKING_STATUS.PENDING } : b
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // B. Chuyển pending → awaiting_payment
  const moveToAwaitingPayment = useCallback(
    async (id: string): Promise<void> => {
      try {
        const supabase = createClient();

        // Get booking to get total_amount
        const { data: booking, error: fetchError } = await supabase
          .from("bookings")
          .select("total_amount")
          .eq("id", id)
          .single();

        if (fetchError || !booking) {
          throw new Error(fetchError?.message || "Không tìm thấy booking");
        }

        // Update booking status
        const { error } = await supabase
          .from("bookings")
          .update({ status: BOOKING_STATUS.AWAITING_PAYMENT })
          .eq("id", id);

        if (error) {
          throw new Error(error.message);
        }

        // Check if payment already exists, if not create new one
        const existingPayment = await getPaymentByBookingId(id);
        if (!existingPayment) {
          // Create payment record with payment_status = pending
          const payment = await createPayment({
            booking_id: id,
            amount: booking.total_amount,
            payment_status: PAYMENT_STATUS.PENDING,
          });

          if (!payment) {
            throw new Error("Không thể tạo payment record");
          }
        }

        setBookings((prevBookings) =>
          prevBookings.map((b) =>
            b.id === id ? { ...b, status: BOOKING_STATUS.AWAITING_PAYMENT } : b
          )
        );
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // C. Chuyển pending/awaiting_payment → confirmed
  const confirmBooking = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();

      // Update booking status
      const { error } = await supabase
        .from("bookings")
        .update({ status: BOOKING_STATUS.CONFIRMED })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      // Update payment status to paid if payment exists and not refunded
      const payment = await getPaymentByBookingId(id);
      if (payment && payment.payment_status !== PAYMENT_STATUS.REFUNDED) {
        const now = new Date().toISOString();
        await updatePaymentStatus(payment.id, PAYMENT_STATUS.PAID, {
          paid_at: now,
          verified_at: now,
        });
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? { ...booking, status: BOOKING_STATUS.CONFIRMED }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // D. Chuyển confirmed → checked_in
  const checkInBooking = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("bookings")
        .update({
          status: BOOKING_STATUS.CHECKED_IN,
          actual_check_in: now,
        })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status: BOOKING_STATUS.CHECKED_IN,
                actual_check_in: now,
              }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // E. Chuyển checked_in → checked_out
  const checkoutBooking = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("bookings")
        .update({
          status: BOOKING_STATUS.CHECKED_OUT,
          actual_check_out: now,
        })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status: BOOKING_STATUS.CHECKED_OUT,
                actual_check_out: now,
              }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // F. Chuyển checked_out → completed
  const completeBooking = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookings")
        .update({ status: BOOKING_STATUS.COMPLETED })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? { ...booking, status: BOOKING_STATUS.COMPLETED }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // G. Chuyển pending/awaiting_payment/confirmed → cancelled
  const cancelBooking = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookings")
        .update({ status: BOOKING_STATUS.CANCELLED })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? { ...booking, status: BOOKING_STATUS.CANCELLED }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // H. Chuyển confirmed → no_show
  const markNoShow = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookings")
        .update({ status: BOOKING_STATUS.NO_SHOW })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? { ...booking, status: BOOKING_STATUS.NO_SHOW }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  // I. Chuyển cancelled → refunded
  const refundBooking = useCallback(async (id: string): Promise<void> => {
    try {
      const supabase = createClient();

      // Update booking status
      const { error } = await supabase
        .from("bookings")
        .update({ status: BOOKING_STATUS.REFUNDED })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      // Update payment status to refunded if payment exists
      const payment = await getPaymentByBookingId(id);
      if (payment) {
        const now = new Date().toISOString();
        await updatePaymentStatus(payment.id, PAYMENT_STATUS.REFUNDED, {
          refunded_at: now,
        });
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id
            ? { ...booking, status: BOOKING_STATUS.REFUNDED }
            : booking
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("bookings")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (error) {
          throw new Error(error.message);
        }

        await fetchBookings(page, limit, search);
      } catch (err) {
        throw err;
      }
    },
    [fetchBookings, page, limit, search]
  );

  const getBookingById = useCallback(
    async (id: string): Promise<BookingRecord | null> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", id)
          .is("deleted_at", null)
          .single();

        if (error || !data) {
          return null;
        }

        return data as BookingRecord;
      } catch {
        return null;
      }
    },
    []
  );

  const getBookingByIdWithDetails = useCallback(
    async (id: string): Promise<BookingRecord | null> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            customers (
              id,
              full_name,
              phone,
              email
            )
          `
          )
          .eq("id", id)
          .is("deleted_at", null)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        return (data as BookingRecord) || null;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Get bookings by customer ID
  const getBookingsByCustomerId = useCallback(
    async (customerId: string): Promise<BookingRecord[]> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            customers (
              id,
              full_name
            ),
            rooms (
              id,
              name
            )
            `
          )
          .eq("customer_id", customerId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        return (data || []) as BookingRecord[];
      } catch {
        return [];
      }
    },
    []
  );

  return {
    bookings,
    isLoading,
    error,
    pagination,
    fetchBookings,
    createBooking,
    updateBooking,
    updateBookingNotes,
    // Status transition functions
    rollbackToPending,
    moveToAwaitingPayment,
    confirmBooking,
    checkInBooking,
    checkoutBooking,
    completeBooking,
    cancelBooking,
    markNoShow,
    refundBooking,
    deleteBooking,
    getBookingById,
    getBookingByIdWithDetails,
    getBookingsByCustomerId,
    // Helper functions
    findConflictingBooking,
  };
}
