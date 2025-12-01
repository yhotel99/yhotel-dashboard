"use client";

import { useState, useCallback } from "react";
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
  updateBookingStatus,
  confirmBooking,
  cancelBooking,
  updateBookingWithRelations,
  transferBooking as transferBookingService,
  getBookingsByCustomerId as getBookingsByCustomerIdService,
} from "@/services/bookings";

// Hook for managing bookings
export function useBookings(options?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const search = options?.search ?? "";

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Fetch all bookings with pagination and search (no customer filter)
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
          searchBookings({
            search: trimmedSearch,
            page: pageNum,
            limit: limitNum,
            customerId: null,
          }),
          countBookings({ search: trimmedSearch, customerId: null }),
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

  // Helper function to update booking status
  const updateBookingStatusInternal = useCallback(
    async (bookingId: string, status: BookingRecord["status"]) => {
      try {
        await updateBookingStatus(bookingId, status);
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId ? { ...booking, status } : booking
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái booking";
        throw new Error(errorMessage);
      }
    },
    []
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
        const updatedBooking = await confirmBooking(bookingId);
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: updatedBooking.status }
              : booking
          )
        );
      } catch (err) {
        throw err;
      }
    },
    []
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
        const updatedBooking = await cancelBooking(bookingId);
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: updatedBooking.status }
              : booking
          )
        );
      } catch (err) {
        throw err;
      }
    },
    []
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

  // Fetch bookings by customer ID with pagination and search
  const fetchBookingsByCustomerId = useCallback(
    async (
      customerIdParam: string,
      pageNum: number = 1,
      limitNum: number = 10,
      searchTerm: string | null = null
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const trimmedSearch = searchTerm?.trim() || null;

        // Call both service functions in parallel for better performance
        const [bookingsData, total] = await Promise.all([
          searchBookings({
            search: trimmedSearch,
            page: pageNum,
            limit: limitNum,
            customerId: customerIdParam,
          }),
          countBookings({ search: trimmedSearch, customerId: customerIdParam }),
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
            : "Không thể tải danh sách bookings";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
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
        return await createBookingWithPayments(input);
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Update booking (simple fields only: total_guests, notes, etc.)
  const updateBooking = useCallback(
    async (
      bookingId: string,
      input: UpdateBookingInput
    ): Promise<BookingRecord> => {
      try {
        return await updateBookingWithRelations(bookingId, input);
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Transfer booking (update room, check-in, check-out, advance_payment and handle payments)
  const transferBooking = useCallback(
    async (
      bookingId: string,
      input: TransferBookingInput
    ): Promise<BookingRecord> => {
      try {
        const updatedBooking = await transferBookingService(bookingId, input);

        // Update local state with new values
        setBookings((prevBookings) =>
          prevBookings.map((booking) => {
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
          })
        );

        return updatedBooking;
      } catch (err) {
        throw err;
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
    updateBookingStatus,
    pendingBooking,
    confirmedBooking,
    checkedInBooking,
    checkedOutBooking,
    cancelledBooking,
    getBookingsByCustomerId,
    fetchBookingsByCustomerId,
    getBookingById,
    createBooking,
    updateBooking,
    transferBooking,
  };
}
