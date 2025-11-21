"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingInput, BookingRecord, PaginationMeta } from "@/lib/types";
import { BOOKING_STATUS } from "@/lib/constants";

// Re-export types for backward compatibility
export type { BookingRecord, PaginationMeta } from "@/lib/types";

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

        // Build query for all bookings
        let query = supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `,
            { count: "exact" }
          )
          .is("deleted_at", null);

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

        let bookingsData = (data || []) as BookingRecord[];

        // Post-process to filter by room name, customer name, phone if search term exists
        if (currentSearch && currentSearch.trim() !== "") {
          const trimmedSearch = currentSearch.trim().toLowerCase();
          bookingsData = bookingsData.filter((booking) => {
            const roomName = booking.rooms?.name?.toLowerCase() || "";
            const bookingId = booking.id.toLowerCase();
            const customerName =
              booking.customers?.full_name?.toLowerCase() || "";
            const customerPhone = booking.customers?.phone?.toLowerCase() || "";

            return (
              roomName.includes(trimmedSearch) ||
              customerName.includes(trimmedSearch) ||
              customerPhone.includes(trimmedSearch) ||
              bookingId.includes(trimmedSearch)
            );
          });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / currentLimit);

        setBookings(bookingsData);
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
            : "Không thể tải danh sách bookings";
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
        const supabase = createClient();
        const { error } = await supabase
          .from("bookings")
          .update({ status })
          .eq("id", bookingId);

        if (error) {
          throw new Error(error.message);
        }
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
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CONFIRMED);
    },
    [updateBookingStatusInternal]
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
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CANCELLED);
    },
    [updateBookingStatusInternal]
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
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            )
          `
          )
          .eq("customer_id", customerIdParam)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        return (data || []) as BookingRecord[];
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
        const supabase = createClient();

        // Calculate offset
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Build query with rooms join
        let query = supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            )
          `,
            { count: "exact" }
          )
          .eq("customer_id", customerIdParam)
          .is("deleted_at", null);

        // Add search filter if search term exists
        if (searchTerm && searchTerm.trim() !== "") {
          const trimmedSearch = searchTerm.trim();
          query = query.ilike("id", `%${trimmedSearch}%`);
        }

        // Fetch data with pagination
        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw new Error(error.message);
        }

        let bookingsData = (data || []) as BookingRecord[];

        // Post-process to filter by room name and booking ID if search term exists
        if (searchTerm && searchTerm.trim() !== "") {
          const trimmedSearch = searchTerm.trim().toLowerCase();
          bookingsData = bookingsData.filter((booking) => {
            const roomName = booking.rooms?.name?.toLowerCase() || "";
            const bookingId = booking.id.toLowerCase();
            return (
              roomName.includes(trimmedSearch) ||
              bookingId.includes(trimmedSearch)
            );
          });
        }

        const total = count || 0;
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
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `
          )
          .eq("id", bookingId)
          .is("deleted_at", null)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No rows returned
            return null;
          }
          throw new Error(error.message);
        }

        return (data || null) as BookingRecord | null;
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
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .insert(input)
          .select(
            `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `
          )
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data as BookingRecord;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo booking";
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Update booking
  const updateBooking = useCallback(
    async (bookingId: string, input: BookingInput): Promise<BookingRecord> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .update(input)
          .eq("id", bookingId)
          .select(
            `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `
          )
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data as BookingRecord;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật booking";
        throw new Error(errorMessage);
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
  };
}
