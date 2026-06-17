
import { createClient } from "@/lib/supabase/server";
import { buildRegistrationFormData } from "@/lib/booking-registration/build-registration-form-data";
import type {
  RegistrationBookingRoomRaw,
  RegistrationFormData,
} from "@/lib/booking-registration/types";
import type {
  BookingRecord,
  BookingInput,
  BookingRoomDetail,
  BookingRoomDetailJoinRow,
  UpdateBookingInput,
  TransferBookingInput,
  PaginationMeta,
  Payment,
} from "@/lib/types";
import {
  BOOKING_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  REPORTING_STATUS,
} from "@/lib/constants";
import {
  assertCanAccessBooking,
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";
import { getBranchBankAccountCached } from "@/services/bank-accounts";
import { getBranchById } from "@/services/branches";
import { getPaymentsByBookingId } from "@/services/payments";
import { getSettings } from "@/services/settings";

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
    const { data, error } = await supabase.rpc("search_bookings_json", {
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
    const { data, error } = await supabase.rpc("count_bookings_json", {
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
        p_final_amount: input.final_amount ?? null,
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

const BOOKING_ROOM_DETAIL_SELECT = `
  room_id,
  amount,
  rooms:room_id (
    id,
    name,
    room_number,
    floor_number
  )
`;

function mapBookingRoomDetailRows(
  rows: BookingRoomDetailJoinRow[]
): BookingRoomDetail[] {
  const details: BookingRoomDetail[] = [];
  for (const row of rows) {
    const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
    if (!room) continue;
    details.push({
      room_id: row.room_id,
      amount: row.amount != null ? Number(row.amount) : null,
      rooms: room,
    });
  }
  return details;
}

/**
 * Phòng và tổng tiền từng phòng của một booking (1 query, indexed by booking_id).
 */
export async function getBookingRoomDetails(
  bookingId: string
): Promise<BookingRoomDetail[]> {
  const id = bookingId.trim();
  if (!id) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_rooms")
    .select(BOOKING_ROOM_DETAIL_SELECT)
    .eq("booking_id", id);

  if (error) {
    throw new Error(error.message);
  }

  return mapBookingRoomDetailRows((data ?? []) as BookingRoomDetailJoinRow[]);
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
        reporting_status: REPORTING_STATUS.INCLUDED,
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
        .update({
          payment_status: PAYMENT_STATUS.CANCELLED,
          reporting_status: REPORTING_STATUS.EXCLUDED,
        })
        .in("id", paymentsToUpdate);

      if (updateError) {
        console.error("Error updating payment status:", updateError);
        // Don't throw error here, booking is already cancelled
        // Just log the error
      }
    }

    const paidPaymentIds = payments
      .filter((p) => p.payment_status === PAYMENT_STATUS.PAID)
      .map((p) => p.id);
    if (paidPaymentIds.length > 0) {
      const { error: reportingError } = await supabase
        .from("payments")
        .update({ reporting_status: REPORTING_STATUS.EXCLUDED })
        .in("id", paidPaymentIds);
      if (reportingError) {
        console.error("Error updating paid payments reporting status:", reportingError);
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
    const baseTotalAmount =
      bookingData.final_amount ?? bookingData.total_amount;
    const roomChargeAmount = baseTotalAmount - bookingData.advance_payment;
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
 * Recalculate pending room_charge payment for a booking when final_amount changes.
 * - Chỉ áp dụng cho booking ở trạng thái pending
 * - Giữ nguyên advance_payment, chỉ cập nhật/ghi nhận lại room_charge pending
 */
export async function recalculatePendingRoomChargePayment(
  bookingId: string,
  finalAmount: number
): Promise<void> {
  try {
    const supabase = await createClient();

    // Lấy thông tin trạng thái và tiền cọc hiện tại
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("status, advance_payment")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      console.error(
        "recalculatePendingRoomChargePayment: cannot fetch booking",
        fetchError
      );
      return;
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      // Chỉ sync cho booking pending
      return;
    }

    const advancePayment = booking.advance_payment ?? 0;

    // Không cho finalAmount nhỏ hơn tiền cọc – nếu có thì bỏ qua (UI đã chặn nhưng check thêm)
    if (finalAmount < advancePayment) {
      console.warn(
        "recalculatePendingRoomChargePayment skipped: final_amount < advance_payment",
        { bookingId, finalAmount, advancePayment }
      );
      return;
    }

    const roomChargeAmount = finalAmount - advancePayment;

    // Lấy tất cả payments pending của booking
    const { data: existingPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, payment_type, payment_status")
      .eq("booking_id", bookingId)
      .eq("payment_status", PAYMENT_STATUS.PENDING);

    if (paymentsError) {
      console.error(
        "recalculatePendingRoomChargePayment: error fetching payments",
        paymentsError
      );
      return;
    }

    const roomChargeRow = existingPayments?.find(
      (p) => p.payment_type === PAYMENT_TYPE.ROOM_CHARGE
    );

    // ADVANCE_PAYMENT: giữ nguyên, không động vào.
    // ROOM_CHARGE: cập nhật theo final_amount - advance_payment
    if (roomChargeRow) {
      if (roomChargeAmount > 0) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({ amount: roomChargeAmount })
          .eq("id", roomChargeRow.id);

        if (updateError) {
          console.error(
            "recalculatePendingRoomChargePayment: cannot update room_charge",
            updateError
          );
        }
      } else {
        // Nếu roomChargeAmount <= 0 thì xoá payment tiền phòng pending
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("id", roomChargeRow.id);

        if (deleteError) {
          console.error(
            "recalculatePendingRoomChargePayment: cannot delete room_charge",
            deleteError
          );
        }
      }
    } else if (roomChargeAmount > 0) {
      // Chưa có room_charge pending -> tạo mới
      const { error: insertError } = await supabase.from("payments").insert({
        booking_id: bookingId,
        amount: roomChargeAmount,
        payment_type: PAYMENT_TYPE.ROOM_CHARGE,
        payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
        payment_status: PAYMENT_STATUS.PENDING,
      });

      if (insertError) {
        console.error(
          "recalculatePendingRoomChargePayment: cannot insert room_charge",
          insertError
        );
      }
    }
  } catch (err) {
    console.error(
      "recalculatePendingRoomChargePayment: unexpected error",
      err
    );
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
    const finalTotalAmount =
      updatedBooking.final_amount ?? updatedBooking.total_amount ?? 0;
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

/**
 * Get bookings list with pagination
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param customerId - Customer ID to filter (optional)
 * @param status - booking_status (optional; null/empty = all)
 * @param cursorCreatedAt - keyset cursor (cùng với cursorId)
 * @param cursorId - keyset cursor
 * @returns Object with bookings data and pagination metadata
 */
export async function getBookingsListWithPagination({
  search,
  page = 1,
  limit = 10,
  customerId,
  creatorId,
  dateField,
  dateFrom,
  dateTo,
  status,
  cursorCreatedAt,
  cursorId,
  branchId,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
  customerId?: string | null;
  creatorId?: string | null;
  dateField?: "created_at" | "check_in" | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: string | null;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  branchId?: string | null;
}): Promise<{
  data: BookingRecord[];
  pagination: PaginationMeta;
}> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();

    // Trim and normalize search and customerId
    const trimmedSearch = search?.trim() || null;
    const trimmedCustomerId = customerId?.trim() || null;
    const trimmedCreatorId = creatorId?.trim() || null;
    const normalizedDateField =
      dateField === "created_at" || dateField === "check_in"
        ? dateField
        : null;
    const trimmedDateFrom = dateFrom?.trim() || null;
    const trimmedDateTo = dateTo?.trim() || null;
    const trimmedStatus = status?.trim() || null;
    const trimmedCursorAt = cursorCreatedAt?.trim() || null;
    const trimmedCursorId = cursorId?.trim() || null;
    const useKeyset = Boolean(trimmedCursorAt && trimmedCursorId);

    const { scope } = await getCurrentUserBranchScope();
    const p_branch_id = resolveBranchFilterId(scope, branchId);

    const { data, error } = await supabase.rpc("list_bookings_json", {
      p_search: trimmedSearch,
      p_page: page,
      p_limit: limit,
      p_customer_id: trimmedCustomerId,
      p_created_by: trimmedCreatorId,
      p_date_field: normalizedDateField,
      p_date_from: trimmedDateFrom,
      p_date_to: trimmedDateTo,
      p_status: trimmedStatus,
      p_cursor_created_at: useKeyset ? trimmedCursorAt : null,
      p_cursor_id: useKeyset ? trimmedCursorId : null,
      p_branch_id,
    });

    if (error) {
      throw new Error(error.message);
    }

    const payload = data as {
      items?: BookingRecord[];
      total?: number;
      next_cursor?: { created_at?: string; id?: string } | null;
    } | null;
    const bookings = (payload?.items ?? []) as BookingRecord[];
    const total = Number(payload?.total ?? 0);
    const totalPages = Math.ceil(total / limit);
    const nc = payload?.next_cursor;
    const nextCursor =
      nc &&
      typeof nc === "object" &&
      nc.id != null &&
      nc.created_at != null
        ? { created_at: String(nc.created_at), id: String(nc.id) }
        : null;

    return {
      data: bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        nextCursor,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách booking";
    console.error("Error fetching bookings list:", err);
    throw new Error(errorMessage);
  }
}

/**
 * Fetch booking registration form data for preview/PDF export.
 */
export async function getBookingRegistrationData(
  bookingId: string
): Promise<RegistrationFormData | null> {
  const id = bookingId.trim();
  if (!id) return null;

  await assertCanAccessBooking(id);

  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      booking_code,
      branch_id,
      check_in,
      check_out,
      number_of_nights,
      total_guests,
      notes,
      total_amount,
      final_amount,
      created_at,
      customers:customer_id (
        full_name,
        email,
        phone,
        nationality,
        id_card,
        date_of_birth
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (bookingError || !booking) {
    return null;
  }

  const { data: bookingRoomsRaw, error: roomsError } = await supabase
    .from("booking_rooms")
    .select(
      `
      room_id,
      amount,
      number_of_nights,
      rooms:room_id (
        id,
        name
      )
    `
    )
    .eq("booking_id", id);

  if (roomsError) {
    throw new Error(roomsError.message);
  }

  const [payments, settings, branch, bankAccount] = await Promise.all([
    getPaymentsByBookingId(id),
    getSettings(),
    booking.branch_id
      ? getBranchById(booking.branch_id)
      : Promise.resolve(null),
    booking.branch_id
      ? getBranchBankAccountCached(booking.branch_id)
      : Promise.resolve(null),
  ]);

  const bookingRooms = (bookingRoomsRaw ?? []).map((row) => {
    const rooms = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
    return {
      room_id: row.room_id as string,
      amount: row.amount != null ? Number(row.amount) : null,
      number_of_nights: Number(row.number_of_nights) || 1,
      rooms: rooms as RegistrationBookingRoomRaw["rooms"],
    };
  }) satisfies RegistrationBookingRoomRaw[];

  const customerRaw = booking.customers;
  const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;

  return buildRegistrationFormData({
    booking: {
      id: booking.id as string,
      booking_code: booking.booking_code as string,
      branch_id: (booking.branch_id as string | null) ?? null,
      check_in: booking.check_in as string,
      check_out: booking.check_out as string,
      number_of_nights: Number(booking.number_of_nights) || 1,
      total_guests: Number(booking.total_guests) || 1,
      notes: (booking.notes as string | null) ?? null,
      total_amount: Number(booking.total_amount) || 0,
      final_amount:
        booking.final_amount != null ? Number(booking.final_amount) : null,
      created_at: booking.created_at as string,
      customers: customer ?? null,
    },
    bookingRooms,
    payments: payments as Payment[],
    settings,
    branch,
    bankAccount,
  });
}
