"use client";

import { createClient } from "@/lib/supabase/client";
import type { BookingRecord } from "@/lib/types";

/**
 * Search bookings using RPC function
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Array of booking records
 */
export async function searchBookings(
  search: string | null,
  page: number,
  limit: number
): Promise<BookingRecord[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_bookings", {
      p_search: search,
      p_page: page,
      p_limit: limit,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as BookingRecord[];
  } catch (err) {
    console.error("Error searching bookings:", err);
    throw err;
  }
}

/**
 * Count bookings matching search criteria
 * @param search - Search term
 * @returns Total count
 */
export async function countBookings(search: string | null): Promise<number> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("count_bookings", {
      p_search: search,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data as number) || 0;
  } catch (err) {
    console.error("Error counting bookings:", err);
    throw err;
  }
}
