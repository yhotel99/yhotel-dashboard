"use client";

import { useState, useEffect, useCallback } from "react";
import type { BookingRecord, BookingInput, PaginationMeta } from "@/lib/types";
import {
  createPayment,
  getPaymentsByBookingId,
  updatePaymentStatus,
  updatePaymentAmount,
} from "@/services/payments";
import {
  searchBookings,
  countBookings,
  findConflictingBooking as findConflictingBookingService,
  createBookingSecure,
  getBookingByIdWithRelations,
  getBookingById as getBookingByIdService,
  getBookingByIdWithDetails as getBookingByIdWithDetailsService,
  getBookingsByCustomerId as getBookingsByCustomerIdService,
  updateBooking as updateBookingService,
  getBookingStatusAndAmount,
  getBookingAmounts,
  updateBookingStatus as updateBookingStatusService,
  deleteBooking as deleteBookingService,
} from "@/services/bookings";
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_METHOD,
} from "@/lib/constants";

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

        const trimmedSearch = searchTerm?.trim() || null;

        // Call both service functions in parallel for better performance
        const [bookingsData, total] = await Promise.all([
          searchBookings(trimmedSearch, pageNum, limitNum),
          countBookings(trimmedSearch),
        ]);

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
      return findConflictingBookingService(roomId, checkIn, checkOut);
    },
    []
  );

  const createBooking = useCallback(
    async (input: BookingInput) => {
      try {
        // Create booking using secure RPC function
        const bookingId = await createBookingSecure(input);

        // Fetch booking with relations
        const bookingData = await getBookingByIdWithRelations(bookingId);

        if (!bookingData) {
          // If can't fetch, still refresh list
          await fetchBookings(page, limit, search);
          throw new Error("Không thể lấy thông tin booking vừa tạo");
        }

        await fetchBookings(page, limit, search);
        return bookingData;
      } catch (err) {
        throw err;
      }
    },
    [fetchBookings, page, limit, search]
  );

  const updateBooking = useCallback(
    async (
      id: string,
      input: {
        notes?: string | null;
        total_guests?: number;
      }
    ) => {
      try {
        const updatedBooking = await updateBookingService(id, input);

        // Cập nhật state thay vì fetch lại, giữ nguyên relations nếu response không có
        setBookings((prevBookings) =>
          prevBookings.map((booking) => {
            if (booking.id === id) {
              // Nếu response không có relations, giữ nguyên từ booking cũ
              return {
                ...booking,
                notes: input.notes !== undefined ? input.notes : booking.notes,
                total_guests: input.total_guests || updatedBooking.total_guests,
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

  const transferBooking = useCallback(
    async (
      id: string,
      input: {
        room_id?: string | null;
        check_in?: string;
        check_out?: string;
        number_of_nights?: number;
        total_amount?: number;
        advance_payment?: number;
      }
    ) => {
      try {
        // Get current booking to check status
        const currentBooking = await getBookingStatusAndAmount(id);

        const updatedBooking = await updateBookingService(id, input);

        // If booking status is awaiting_payment and total_amount provided, update payments
        if (
          currentBooking?.status === BOOKING_STATUS.AWAITING_PAYMENT &&
          input.total_amount !== undefined
        ) {
          const advancePayment = input.advance_payment || 0;
          const roomChargeAmount = input.total_amount - advancePayment;

          // Get all payments for this booking
          const existingPayments = await getPaymentsByBookingId(id);

          if (existingPayments.length > 0) {
            // Find and update ROOM_CHARGE payment
            const roomChargePayment = existingPayments.find(
              (p) =>
                p.payment_type === PAYMENT_TYPE.ROOM_CHARGE &&
                p.payment_status !== PAYMENT_STATUS.REFUNDED
            );

            if (roomChargePayment) {
              await updatePaymentAmount(roomChargePayment.id, roomChargeAmount);
            }

            // Handle ADVANCE_PAYMENT payment
            if (input.advance_payment !== undefined) {
              const advancePaymentRecord = existingPayments.find(
                (p) =>
                  p.payment_type === PAYMENT_TYPE.ADVANCE_PAYMENT &&
                  p.payment_status !== PAYMENT_STATUS.REFUNDED
              );

              if (advancePaymentRecord) {
                // If payment exists, update amount (even if advance_payment = 0)
                await updatePaymentAmount(
                  advancePaymentRecord.id,
                  advancePayment
                );
              } else if (advancePayment > 0) {
                // If payment doesn't exist and advance_payment > 0, create it
                await createPayment({
                  booking_id: id,
                  amount: advancePayment,
                  payment_type: PAYMENT_TYPE.ADVANCE_PAYMENT,
                  payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
                  payment_status: PAYMENT_STATUS.PAID,
                });
              }
              // If advance_payment = 0 and payment doesn't exist, do nothing
            }
          }
        }

        // Cập nhật state thay vì fetch lại, giữ nguyên relations nếu response không có
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

  const updateBookingNotes = useCallback(
    async (id: string, notes: string | null): Promise<BookingRecord> => {
      try {
        const updatedBooking = await updateBookingService(id, { notes });

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

  // B. Chuyển pending → awaiting_payment
  const moveToAwaitingPayment = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Get booking to get total_amount and advance_payment
        const bookingAmounts = await getBookingAmounts(id);

        if (!bookingAmounts) {
          throw new Error("Không tìm thấy booking");
        }

        const { total_amount, advance_payment } = bookingAmounts;

        // Update booking status
        await updateBookingStatusService(id, BOOKING_STATUS.AWAITING_PAYMENT);

        // Check if payments already exist, if not create new ones
        const existingPayments = await getPaymentsByBookingId(id);
        if (existingPayments.length === 0) {
          // If there's advance_payment, create 2 payments
          if (advance_payment > 0) {
            // Payment 1: room_charge (remaining amount to pay)
            const roomChargeAmount = total_amount - advance_payment;
            const roomChargePayment = await createPayment({
              booking_id: id,
              amount: roomChargeAmount,
              payment_type: PAYMENT_TYPE.ROOM_CHARGE,
              payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
              payment_status: PAYMENT_STATUS.PENDING,
            });

            if (!roomChargePayment) {
              throw new Error("Không thể tạo payment record cho room charge");
            }

            // Payment 2: advance_payment (deposit amount)
            const advancePaymentRecord = await createPayment({
              booking_id: id,
              amount: advance_payment,
              payment_type: PAYMENT_TYPE.ADVANCE_PAYMENT,
              payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
              payment_status: PAYMENT_STATUS.PAID,
            });

            if (!advancePaymentRecord) {
              throw new Error(
                "Không thể tạo payment record cho advance payment"
              );
            }
          } else {
            // No advance_payment, create single room_charge payment
            const payment = await createPayment({
              booking_id: id,
              amount: total_amount,
              payment_type: PAYMENT_TYPE.ROOM_CHARGE,
              payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
              payment_status: PAYMENT_STATUS.PENDING,
            });

            if (!payment) {
              throw new Error("Không thể tạo payment record");
            }
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
      // Update booking status
      await updateBookingStatusService(id, BOOKING_STATUS.CONFIRMED);

      // Update ROOM_CHARGE payment status to paid
      const payments = await getPaymentsByBookingId(id);
      const roomChargePayment = payments.find(
        (p) =>
          p.payment_type === PAYMENT_TYPE.ROOM_CHARGE &&
          p.payment_status !== PAYMENT_STATUS.REFUNDED
      );

      if (roomChargePayment) {
        const now = new Date().toISOString();
        await updatePaymentStatus(roomChargePayment.id, PAYMENT_STATUS.PAID, {
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
      const now = new Date().toISOString();

      await updateBookingStatusService(id, BOOKING_STATUS.CHECKED_IN, {
        actual_check_in: now,
      });

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
      const now = new Date().toISOString();

      await updateBookingStatusService(id, BOOKING_STATUS.CHECKED_OUT, {
        actual_check_out: now,
      });

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
      await updateBookingStatusService(id, BOOKING_STATUS.COMPLETED);

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
      await updateBookingStatusService(id, BOOKING_STATUS.CANCELLED);

      // Update pending ROOM_CHARGE payments to cancelled
      const payments = await getPaymentsByBookingId(id);
      const pendingRoomChargePayments = payments.filter(
        (p) =>
          p.payment_type === PAYMENT_TYPE.ROOM_CHARGE &&
          p.payment_status === PAYMENT_STATUS.PENDING
      );

      for (const payment of pendingRoomChargePayments) {
        await updatePaymentStatus(payment.id, PAYMENT_STATUS.CANCELLED);
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
      await updateBookingStatusService(id, BOOKING_STATUS.NO_SHOW);

      // Update pending ROOM_CHARGE payments to cancelled
      const payments = await getPaymentsByBookingId(id);
      const pendingRoomChargePayments = payments.filter(
        (p) =>
          p.payment_type === PAYMENT_TYPE.ROOM_CHARGE &&
          p.payment_status === PAYMENT_STATUS.PENDING
      );

      for (const payment of pendingRoomChargePayments) {
        await updatePaymentStatus(payment.id, PAYMENT_STATUS.CANCELLED);
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
      // Update booking status
      await updateBookingStatusService(id, BOOKING_STATUS.REFUNDED);

      // Update payments
      const payments = await getPaymentsByBookingId(id);
      const now = new Date().toISOString();

      for (const payment of payments) {
        // ADVANCE_PAYMENT: paid -> refunded
        if (
          payment.payment_type === PAYMENT_TYPE.ADVANCE_PAYMENT &&
          payment.payment_status === PAYMENT_STATUS.PAID
        ) {
          await updatePaymentStatus(payment.id, PAYMENT_STATUS.REFUNDED, {
            refunded_at: now,
          });
          continue;
        }

        // ROOM_CHARGE: pending -> cancelled
        if (
          payment.payment_type === PAYMENT_TYPE.ROOM_CHARGE &&
          payment.payment_status === PAYMENT_STATUS.PENDING
        ) {
          await updatePaymentStatus(payment.id, PAYMENT_STATUS.CANCELLED);
        }
        // ROOM_CHARGE: paid -> refunded
        else if (
          payment.payment_type === PAYMENT_TYPE.ROOM_CHARGE &&
          payment.payment_status === PAYMENT_STATUS.PAID
        ) {
          await updatePaymentStatus(payment.id, PAYMENT_STATUS.REFUNDED, {
            refunded_at: now,
          });
        }
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
        await deleteBookingService(id);
        await fetchBookings(page, limit, search);
      } catch (err) {
        throw err;
      }
    },
    [fetchBookings, page, limit, search]
  );

  const getBookingById = useCallback(
    async (id: string): Promise<BookingRecord | null> => {
      return getBookingByIdService(id);
    },
    []
  );

  const getBookingByIdWithDetails = useCallback(
    async (id: string): Promise<BookingRecord | null> => {
      return getBookingByIdWithDetailsService(id);
    },
    []
  );

  // Get bookings by customer ID
  const getBookingsByCustomerId = useCallback(
    async (customerId: string): Promise<BookingRecord[]> => {
      return getBookingsByCustomerIdService(customerId);
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
    transferBooking,
    updateBookingNotes,
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
