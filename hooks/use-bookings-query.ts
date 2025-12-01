"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type {
  BookingInput,
  BookingRecord,
  PaginationMeta,
  UpdateBookingInput,
  TransferBookingInput,
} from "@/lib/types";
import { BOOKING_STATUS } from "@/lib/constants";
import {
  searchBookings,
  countBookings,
  createBookingWithPayments,
  getBookingByIdWithRelations,
  updateBookingStatus as updateBookingStatusService,
  confirmBooking as confirmBookingService,
  cancelBooking as cancelBookingService,
  updateBookingWithRelations,
  transferBooking as transferBookingService,
  getBookingsByCustomerId as getBookingsByCustomerIdService,
} from "@/services/bookings";

// Type for SWR data
type BookingsData = {
  bookings: BookingRecord[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function bookingsFetcher(key: string): Promise<BookingsData> {
  const [, page, limit, search, customerId] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;
  const trimmedCustomerId = customerId === "null" ? null : customerId;

  // Call both service functions in parallel for better performance
  const [bookingsData, total] = await Promise.all([
    searchBookings({
      search: trimmedSearch,
      page: pageNum,
      limit: limitNum,
      customerId: trimmedCustomerId,
    }),
    countBookings({ search: trimmedSearch, customerId: trimmedCustomerId }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    bookings: bookingsData,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
}

/**
 * Hook for managing bookings with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 * @param customerId - Optional customer ID to filter bookings
 * @param enabled - Whether to enable fetching (default: true)
 */
export function useBookingsQuery(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  customerId: string | null = null,
  enabled: boolean = true
) {
  // Create SWR key from params
  const swrKey = useMemo(() => {
    if (!enabled) return null;
    return `bookings:${page}:${limit}:${search?.trim() || "null"}:${customerId || "null"}`;
  }, [page, limit, search, customerId, enabled]);

  // Use SWR to fetch bookings
  const { data, error, isLoading, mutate } = useSWR<BookingsData>(
    swrKey,
    bookingsFetcher
  );

  const bookings = data?.bookings || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Helper function to update booking status
  const updateBookingStatusInternal = useCallback(
    async (bookingId: string, status: BookingRecord["status"]) => {
      try {
        await updateBookingStatusService(bookingId, status);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            bookings: current.bookings.map((booking) => {
              if (booking.id === bookingId) {
                return { ...booking, status };
              }
              return booking;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái booking";
        throw new Error(errorMessage);
      }
    },
    [mutate]
  );

  // Update booking status to pending
  const pendingBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.PENDING);
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to confirmed
  const confirmedBooking = useCallback(
    async (bookingId: string) => {
      try {
        const updatedBooking = await confirmBookingService(bookingId);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            bookings: current.bookings.map((booking) => {
              if (booking.id === bookingId) {
                return { ...booking, status: updatedBooking.status };
              }
              return booking;
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

  // Update booking status to checked_in
  const checkedInBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_IN);
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to checked_out
  const checkedOutBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_OUT);
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to cancelled
  const cancelledBooking = useCallback(
    async (bookingId: string) => {
      try {
        const updatedBooking = await cancelBookingService(bookingId);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            bookings: current.bookings.map((booking) => {
              if (booking.id === bookingId) {
                return { ...booking, status: updatedBooking.status };
              }
              return booking;
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

  // Generic update booking status (for backward compatibility)
  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingRecord["status"]) => {
      await updateBookingStatusInternal(bookingId, status);
    },
    [updateBookingStatusInternal]
  );

  // Get bookings by customer ID (simple version - all bookings without pagination)
  const getBookingsByCustomerId = useCallback(
    async (customerIdParam: string): Promise<BookingRecord[]> => {
      try {
        return await getBookingsByCustomerIdService(customerIdParam);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        return [];
      }
    },
    []
  );

  // Get booking by ID
  const getBookingById = useCallback(
    async (bookingId: string): Promise<BookingRecord | null> => {
      try {
        return await getBookingByIdWithRelations(bookingId);
      } catch (err) {
        console.error("Error fetching booking:", err);
        throw err;
      }
    },
    []
  );

  // Create booking
  const createBooking = useCallback(
    async (input: BookingInput): Promise<BookingRecord> => {
      try {
        const newBooking = await createBookingWithPayments(input);

        // Revalidate SWR cache
        await mutate();
        return newBooking;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update booking (simple fields only: total_guests, notes, etc.)
  const updateBooking = useCallback(
    async (
      bookingId: string,
      input: UpdateBookingInput
    ): Promise<BookingRecord> => {
      try {
        const updatedBooking = await updateBookingWithRelations(bookingId, input);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            bookings: current.bookings.map((booking) => {
              if (booking.id === bookingId) {
                return updatedBooking;
              }
              return booking;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedBooking;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Transfer booking (update room, check-in, check-out, advance_payment and handle payments)
  const transferBooking = useCallback(
    async (
      bookingId: string,
      input: TransferBookingInput
    ): Promise<BookingRecord> => {
      try {
        const updatedBooking = await transferBookingService(bookingId, input);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            bookings: current.bookings.map((booking) => {
              if (booking.id === bookingId) {
                return {
                  ...booking,
                  ...input,
                  total_amount: updatedBooking.total_amount,
                  advance_payment: updatedBooking.advance_payment,
                  // Keep existing relations
                  customers: booking.customers,
                  rooms: updatedBooking.rooms || booking.rooms,
                };
              }
              return booking;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedBooking;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Refetch bookings
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    bookings,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách booking"
      : null,
    pagination,
    updateBookingStatus,
    pendingBooking,
    confirmedBooking,
    checkedInBooking,
    checkedOutBooking,
    cancelledBooking,
    getBookingsByCustomerId,
    getBookingById,
    createBooking,
    updateBooking,
    transferBooking,
    refetch,
    mutate,
  };
}

