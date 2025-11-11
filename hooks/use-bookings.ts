"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingRecord, BookingInput, PaginationMeta } from "@/lib/types";

// Re-export types for backward compatibility
export type {
  BookingRecord,
  BookingInput,
  BookingStatus,
  PaginationMeta,
} from "@/lib/types";

// Type for raw booking data from Supabase with relations
type BookingWithRelations = BookingRecord & {
  customers?: {
    id: string;
    full_name: string;
  } | null;
  rooms?: {
    id: string;
    name: string;
  } | null;
};

// Utility to normalise numeric fields coming from Supabase (NUMERIC -> string)
function normaliseBooking(data: BookingWithRelations): BookingRecord {
  return {
    ...data,
    number_of_nights:
      typeof data.number_of_nights === "number"
        ? data.number_of_nights
        : Number(data.number_of_nights ?? 0),
    total_guests:
      typeof data.total_guests === "number"
        ? data.total_guests
        : Number(data.total_guests ?? 0),
    total_amount:
      typeof data.total_amount === "number"
        ? data.total_amount
        : Number(data.total_amount ?? 0),
    advance_payment:
      typeof data.advance_payment === "number"
        ? data.advance_payment
        : Number(data.advance_payment ?? 0),
    notes: data.notes ?? null,
    actual_check_in: data.actual_check_in ?? null,
    actual_check_out: data.actual_check_out ?? null,
    customers: data.customers ?? null,
    rooms: data.rooms ?? null,
  } as BookingRecord;
}

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

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabase
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
            `,
            { count: "exact" }
          )
          .is("deleted_at", null);

        if (searchTerm && searchTerm.trim() !== "") {
          const trimmed = searchTerm.trim();
          query = query.or(`notes.ilike.%${trimmed}%,status.eq.${trimmed}`);
        }

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw new Error(error.message);
        }

        const bookingsData = (data || []).map(normaliseBooking);
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

  const createBooking = useCallback(
    async (input: BookingInput) => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .insert([input])
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const newBooking = normaliseBooking(data);
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

        const updatedBooking = normaliseBooking(data);
        await fetchBookings(page, limit, search);
        return updatedBooking;
      } catch (err) {
        throw err;
      }
    },
    [fetchBookings, page, limit, search]
  );

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

        return normaliseBooking(data);
      } catch {
        return null;
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

        return ((data || []) as BookingWithRelations[]).map(normaliseBooking);
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
    deleteBooking,
    getBookingById,
    getBookingsByCustomerId,
  };
}
