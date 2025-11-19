import { createClient } from "@/lib/supabase/client";
import type { BookingRecord, BookingInput } from "@/lib/types";
import { BOOKING_STATUS } from "@/lib/constants";

/**
 * Search bookings with pagination
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

/**
 * Find conflicting booking for a room and time range
 * @param roomId - Room ID
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @returns Conflicting booking or null
 */
export async function findConflictingBooking(
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<BookingRecord | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .in("status", [
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.AWAITING_PAYMENT,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.CHECKED_IN,
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
  } catch (err) {
    console.error("Error finding conflicting booking:", err);
    return null;
  }
}

/**
 * Create booking using secure RPC function
 * @param input - Booking input data
 * @returns Created booking ID
 */
export async function createBookingSecure(
  input: BookingInput
): Promise<string> {
  try {
    const supabase = createClient();
    const { data: bookingId, error } = await supabase.rpc(
      "create_booking_secure",
      {
        p_customer_id: input.customer_id || null,
        p_room_id: input.room_id || null,
        p_check_in: input.check_in,
        p_check_out: input.check_out,
        p_number_of_nights: input.number_of_nights || 0,
        p_total_amount: input.total_amount,
        p_total_guests: input.total_guests ?? 1,
        p_notes: input.notes || null,
        p_advance_payment: input.advance_payment ?? 0,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!bookingId) {
      throw new Error("Không thể tạo booking");
    }

    return bookingId;
  } catch (err) {
    console.error("Error creating booking:", err);
    throw err;
  }
}

/**
 * Get booking by ID with relations
 * @param bookingId - Booking ID
 * @returns Booking record with customer and room relations
 */
export async function getBookingByIdWithRelations(
  bookingId: string
): Promise<BookingRecord | null> {
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
      .eq("id", bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as BookingRecord;
  } catch (err) {
    console.error("Error fetching booking:", err);
    return null;
  }
}

/**
 * Get booking by ID
 * @param bookingId - Booking ID
 * @returns Booking record or null
 */
export async function getBookingById(
  bookingId: string
): Promise<BookingRecord | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as BookingRecord;
  } catch (err) {
    console.error("Error fetching booking:", err);
    return null;
  }
}

/**
 * Get booking by ID with customer details
 * @param bookingId - Booking ID
 * @returns Booking record with customer details or null
 */
export async function getBookingByIdWithDetails(
  bookingId: string
): Promise<BookingRecord | null> {
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
      .eq("id", bookingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as BookingRecord) || null;
  } catch (err) {
    console.error("Error fetching booking with details:", err);
    throw err;
  }
}

/**
 * Get bookings by customer ID
 * @param customerId - Customer ID
 * @returns Array of booking records
 */
export async function getBookingsByCustomerId(
  customerId: string
): Promise<BookingRecord[]> {
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
  } catch (err) {
    console.error("Error fetching bookings by customer:", err);
    return [];
  }
}

/**
 * Update booking
 * @param bookingId - Booking ID
 * @param input - Update data
 * @returns Updated booking record
 */
export async function updateBooking(
  bookingId: string,
  input: Partial<BookingInput>
): Promise<BookingRecord> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .update(input)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as BookingRecord;
  } catch (err) {
    console.error("Error updating booking:", err);
    throw err;
  }
}

/**
 * Get booking status and total amount
 * @param bookingId - Booking ID
 * @returns Booking status and total amount
 */
export async function getBookingStatusAndAmount(bookingId: string): Promise<{
  status: string;
  total_amount: number;
} | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("status, total_amount")
      .eq("id", bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      status: data.status,
      total_amount: data.total_amount,
    };
  } catch (err) {
    console.error("Error fetching booking status:", err);
    return null;
  }
}

/**
 * Get booking total amount
 * @param bookingId - Booking ID
 * @returns Total amount or null
 */
export async function getBookingTotalAmount(
  bookingId: string
): Promise<number | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("total_amount")
      .eq("id", bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.total_amount;
  } catch (err) {
    console.error("Error fetching booking total amount:", err);
    return null;
  }
}

/**
 * Get booking total amount and advance payment
 * @param bookingId - Booking ID
 * @returns Object with total_amount and advance_payment or null
 */
export async function getBookingAmounts(bookingId: string): Promise<{
  total_amount: number;
  advance_payment: number;
} | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("total_amount, advance_payment")
      .eq("id", bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      total_amount: data.total_amount,
      advance_payment: data.advance_payment || 0,
    };
  } catch (err) {
    console.error("Error fetching booking amounts:", err);
    return null;
  }
}

/**
 * Update booking status
 * @param bookingId - Booking ID
 * @param status - New status
 * @param additionalData - Optional additional fields (actual_check_in, actual_check_out)
 * @returns Updated booking record
 */
export async function updateBookingStatus(
  bookingId: string,
  status: string,
  additionalData?: {
    actual_check_in?: string;
    actual_check_out?: string;
  }
): Promise<BookingRecord> {
  try {
    const supabase = createClient();
    const updateData: Record<string, unknown> = { status };

    if (additionalData?.actual_check_in !== undefined) {
      updateData.actual_check_in = additionalData.actual_check_in;
    }
    if (additionalData?.actual_check_out !== undefined) {
      updateData.actual_check_out = additionalData.actual_check_out;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as BookingRecord;
  } catch (err) {
    console.error("Error updating booking status:", err);
    throw err;
  }
}

/**
 * Delete booking (soft delete)
 * @param bookingId - Booking ID
 */
export async function deleteBooking(bookingId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error deleting booking:", err);
    throw err;
  }
}
