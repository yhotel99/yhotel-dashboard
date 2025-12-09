"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  BookingRecord,
  BookingInput,
  UpdateBookingInput,
  TransferBookingInput,
} from "@/lib/types";
import {
  BOOKING_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants";

/**
 * Search bookings with pagination
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Array of booking records
 */
export async function searchBookings({
  search,
  page,
  limit,
  customerId,
}: {
  search: string | null;
  page: number;
  limit: number;
  customerId: string | null;
}): Promise<BookingRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_bookings", {
      p_search: search,
      p_page: page,
      p_limit: limit,
      p_customer_id: customerId,
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
export async function countBookings({
  search,
  customerId,
}: {
  search: string | null;
  customerId: string | null;
}): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("count_bookings", {
      p_search: search,
      p_customer_id: customerId,
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
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .in("status", [
        BOOKING_STATUS.PENDING,
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
 * Get booking by ID with full customer and room details for checkout
 * @param bookingId - Booking ID
 * @returns Booking record with full customer and room relations
 */
export async function getBookingByIdForCheckout(
  bookingId: string
): Promise<BookingRecord | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        customers:customer_id (
          id,
          full_name,
          phone,
          email
        ),
        rooms:room_id (
          id,
          name
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return (data as BookingRecord) || null;
  } catch (err) {
    console.error("Error fetching booking for checkout:", err);
    throw err;
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
 * Update booking with relations
 * @param bookingId - Booking ID
 * @param input - Update data
 * @returns Updated booking record with relations
 */
export async function updateBookingWithRelations(
  bookingId: string,
  input: UpdateBookingInput
): Promise<BookingRecord> {
  try {
    const supabase = await createClient();
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
}

/**
 * Confirm booking (update status and mark payments as paid)
 * @param bookingId - Booking ID
 * @returns Updated booking record
 */
export async function confirmBooking(
  bookingId: string
): Promise<BookingRecord> {
  try {
    const supabase = await createClient();

    // Update booking status
    const updatedBooking = await updateBookingStatus(
      bookingId,
      BOOKING_STATUS.CONFIRMED
    );

    // Update payment status to paid for all payments of this booking
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: now,
      })
      .eq("booking_id", bookingId);

    if (error) {
      console.error("Error updating payment status:", error);
      // Don't throw error here, booking is already confirmed
      // Just log the error
    }

    return updatedBooking;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xác nhận booking";
    throw new Error(errorMessage);
  }
}

/**
 * Cancel booking (update status and cancel pending payments)
 * @param bookingId - Booking ID
 * @returns Updated booking record
 */
export async function cancelBooking(bookingId: string): Promise<BookingRecord> {
  try {
    const supabase = await createClient();

    // Update booking status
    const updatedBooking = await updateBookingStatus(
      bookingId,
      BOOKING_STATUS.CANCELLED
    );

    // Get all payments for this booking
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", bookingId);

    if (fetchError) {
      console.error("Error fetching payments:", fetchError);
      // Don't throw error here, booking is already cancelled
      // Just log the error
      return updatedBooking;
    }

    if (!payments || payments.length === 0) {
      // No payments to update
      return updatedBooking;
    }

    // Update payments: if pending -> cancelled, if paid -> keep paid
    const paymentsToUpdate = payments
      .filter((p) => p.payment_status === PAYMENT_STATUS.PENDING)
      .map((p) => p.id);

    if (paymentsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from("payments")
        .update({ payment_status: PAYMENT_STATUS.CANCELLED })
        .in("id", paymentsToUpdate);

      if (updateError) {
        console.error("Error updating payment status:", updateError);
        // Don't throw error here, booking is already cancelled
        // Just log the error
      }
    }

    return updatedBooking;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể hủy booking";
    throw new Error(errorMessage);
  }
}

/**
 * Create booking with payments
 * @param input - Booking input data
 * @returns Created booking record with relations
 */
export async function createBookingWithPayments(
  input: BookingInput
): Promise<BookingRecord> {
  try {
    const supabase = await createClient();

    // Create booking using secure RPC function
    const bookingId = await createBookingSecure(input);

    // Fetch booking with relations
    const bookingData = await getBookingByIdWithRelations(bookingId);

    if (!bookingData) {
      throw new Error("Không thể lấy thông tin booking vừa tạo");
    }

    // Create payments for the booking
    const paymentsToCreate = [];

    // Payment 1: advance_payment (only if advance_payment > 0)
    if (bookingData.advance_payment > 0) {
      paymentsToCreate.push({
        booking_id: bookingData.id,
        amount: bookingData.advance_payment,
        payment_type: PAYMENT_TYPE.ADVANCE_PAYMENT,
        payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
        payment_status: PAYMENT_STATUS.PENDING,
      });
    }

    // Payment 2: room_charge (remaining amount after advance_payment)
    const roomChargeAmount =
      bookingData.total_amount - bookingData.advance_payment;
    if (roomChargeAmount > 0) {
      paymentsToCreate.push({
        booking_id: bookingData.id,
        amount: roomChargeAmount,
        payment_type: PAYMENT_TYPE.ROOM_CHARGE,
        payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
        payment_status: PAYMENT_STATUS.PENDING,
      });
    }

    // Insert payments
    if (paymentsToCreate.length > 0) {
      const { error: paymentsError } = await supabase
        .from("payments")
        .insert(paymentsToCreate);

      if (paymentsError) {
        console.error("Error creating payments:", paymentsError);
        throw new Error(
          `Đã tạo booking nhưng không thể tạo payments: ${paymentsError.message}`
        );
      }
    }

    return bookingData;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo booking";
    throw new Error(errorMessage);
  }
}

/**
 * Transfer booking (update room, check-in, check-out, advance_payment and handle payments)
 * @param bookingId - Booking ID
 * @param input - Transfer booking input data
 * @returns Updated booking record with relations
 */
export async function transferBooking(
  bookingId: string,
  input: TransferBookingInput
): Promise<BookingRecord> {
  try {
    const supabase = await createClient();

    // Step 1: Get current booking to check status
    const { data: currentBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("status, advance_payment, total_amount")
      .eq("id", bookingId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!currentBooking) {
      throw new Error("Không tìm thấy booking");
    }

    // Step 2: Check if booking is pending (only allow transfer for pending bookings)
    if (currentBooking.status !== BOOKING_STATUS.PENDING) {
      throw new Error(
        "Chỉ có thể chuyển phòng khi booking ở trạng thái pending"
      );
    }

    // Step 3: Update booking
    const { error: updateError } = await supabase
      .from("bookings")
      .update(input)
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Step 4: Fetch updated booking with relations
    const { data: updatedBooking, error: fetchUpdatedError } = await supabase
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
      .single();

    if (fetchUpdatedError) {
      throw new Error(fetchUpdatedError.message);
    }

    if (!updatedBooking) {
      throw new Error("Không tìm thấy booking sau khi cập nhật");
    }

    // Step 5: Calculate payment amounts from updated booking
    const finalTotalAmount = updatedBooking.total_amount ?? 0;
    const finalAdvancePayment = updatedBooking.advance_payment ?? 0;
    const finalRoomChargeAmount = finalTotalAmount - finalAdvancePayment;

    // Step 6: Get existing payments (only pending payments can be updated)
    const { data: existingPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, payment_type, payment_status")
      .eq("booking_id", bookingId)
      .eq("payment_status", PAYMENT_STATUS.PENDING);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      // Continue anyway - we'll try to create/update payments
    }

    // Step 7: Handle ADVANCE_PAYMENT
    const existingAdvancePayment = existingPayments?.find(
      (p) => p.payment_type === PAYMENT_TYPE.ADVANCE_PAYMENT
    );

    if (existingAdvancePayment) {
      // Payment exists - update or delete
      if (finalAdvancePayment > 0) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({ amount: finalAdvancePayment })
          .eq("id", existingAdvancePayment.id);

        if (updateError) {
          throw new Error(
            `Không thể cập nhật advance payment: ${updateError.message}`
          );
        }
      } else {
        // Delete if advance_payment is 0
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("id", existingAdvancePayment.id);

        if (deleteError) {
          throw new Error(
            `Không thể xóa advance payment: ${deleteError.message}`
          );
        }
      }
    } else {
      // Payment doesn't exist - create if needed
      if (finalAdvancePayment > 0) {
        const { error: createError } = await supabase.from("payments").insert({
          booking_id: bookingId,
          amount: finalAdvancePayment,
          payment_type: PAYMENT_TYPE.ADVANCE_PAYMENT,
          payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
          payment_status: PAYMENT_STATUS.PENDING,
        });

        if (createError) {
          throw new Error(
            `Không thể tạo advance payment: ${createError.message}`
          );
        }
      }
    }

    // Step 8: Handle ROOM_CHARGE
    const existingRoomCharge = existingPayments?.find(
      (p) => p.payment_type === PAYMENT_TYPE.ROOM_CHARGE
    );

    if (existingRoomCharge) {
      // Payment exists - update or delete
      if (finalRoomChargeAmount > 0) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({ amount: finalRoomChargeAmount })
          .eq("id", existingRoomCharge.id);

        if (updateError) {
          throw new Error(
            `Không thể cập nhật room charge: ${updateError.message}`
          );
        }
      } else {
        // Delete if room_charge is 0 or negative
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("id", existingRoomCharge.id);

        if (deleteError) {
          throw new Error(`Không thể xóa room charge: ${deleteError.message}`);
        }
      }
    } else {
      // Payment doesn't exist - create if needed
      if (finalRoomChargeAmount > 0) {
        const { error: createError } = await supabase.from("payments").insert({
          booking_id: bookingId,
          amount: finalRoomChargeAmount,
          payment_type: PAYMENT_TYPE.ROOM_CHARGE,
          payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
          payment_status: PAYMENT_STATUS.PENDING,
        });

        if (createError) {
          throw new Error(`Không thể tạo room charge: ${createError.message}`);
        }
      }
    }

    return updatedBooking as BookingRecord;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể chuyển phòng";
    throw new Error(errorMessage);
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
