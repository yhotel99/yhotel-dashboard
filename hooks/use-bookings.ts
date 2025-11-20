"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingRecord, PaginationMeta } from "@/lib/types";

// Re-export types for backward compatibility
export type { BookingRecord, PaginationMeta } from "@/lib/types";

// Hook for managing bookings by customer ID
export function useBookingsByCustomer(
  customerId: string,
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

  // Fetch bookings with pagination and search
  const fetchBookings = useCallback(
    async (
      customerIdParam: string = customerId,
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
        // Search by booking id (first 8 chars) or room name
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

        // Post-process to filter by room name if search term exists
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
    [customerId, page, limit, search]
  );

  // Load bookings on mount or when page/limit/search/customerId changes
  useEffect(() => {
    if (customerId) {
      fetchBookings(customerId, page, limit, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, page, limit, search]);

  return {
    bookings,
    isLoading,
    error,
    pagination,
    fetchBookings,
  };
}

// Hook for managing bookings
export function useBookings() {
  // Get bookings by customer ID (simple version - all bookings)
  const getBookingsByCustomerId = useCallback(
    async (customerId: string): Promise<BookingRecord[]> => {
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
          .eq("customer_id", customerId)
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
      customerId: string,
      page: number = 1,
      limit: number = 10,
      search: string | null = null
    ): Promise<{ bookings: BookingRecord[]; pagination: PaginationMeta }> => {
      try {
        const supabase = createClient();

        // Calculate offset
        const from = (page - 1) * limit;
        const to = from + limit - 1;

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
          .eq("customer_id", customerId)
          .is("deleted_at", null);

        // Add search filter if search term exists
        // Search by booking id (first 8 chars) or room name
        if (search && search.trim() !== "") {
          const trimmedSearch = search.trim();
          // Note: Supabase doesn't support searching in joined tables directly
          // So we search by booking id only, room name search would need post-processing
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

        // Post-process to filter by room name if search term exists
        if (search && search.trim() !== "") {
          const trimmedSearch = search.trim().toLowerCase();
          bookingsData = bookingsData.filter((booking) => {
            const roomName = booking.rooms?.name?.toLowerCase() || "";
            return roomName.includes(trimmedSearch);
          });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          bookings: bookingsData,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        };
      } catch (err) {
        console.error("Error fetching bookings:", err);
        throw err;
      }
    },
    []
  );

  return {
    getBookingsByCustomerId,
    fetchBookingsByCustomerId,
  };
}
