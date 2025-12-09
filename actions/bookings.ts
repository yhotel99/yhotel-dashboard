"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingInput,
  UpdateBookingInput,
  TransferBookingInput,
  BookingStatus,
  BookingRecord,
} from "@/lib/types";
import {
  BOOKING_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants";

/**
 * Create booking using secure RPC function
 */
async function createBookingSecure(
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
 */
async function getBookingByIdWithRelations(
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
export async function getBookingByIdForCheckoutAction(
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
 * Update booking status
 */
async function updateBookingStatusInternal(
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
 * Create booking with payments
 */
export async function createBooking(input: BookingInput) {
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

    // Revalidate bookings page after creating
    revalidatePath("/dashboard/bookings");

    return bookingData;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo booking";
    throw new Error(errorMessage);
  }
}

/**
 * Update booking
 */
export async function updateBooking(
  bookingId: string,
  input: UpdateBookingInput
) {
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

    // Revalidate bookings page after updating
    revalidatePath("/dashboard/bookings");

    return data as BookingRecord;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật booking";
    throw new Error(errorMessage);
  }
}

/**
 * Update booking status
 */
export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus
) {
  try {
    await updateBookingStatusInternal(bookingId, status);
    // Revalidate bookings page after updating status
    revalidatePath("/dashboard/bookings");
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái booking";
    throw new Error(errorMessage);
  }
}

/**
 * Confirm booking (update status and mark payments as paid)
 */
export async function confirmBookingAction(bookingId: string) {
  try {
    const supabase = await createClient();

    // Update booking status
    await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CONFIRMED);

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

    // Revalidate bookings page after confirming
    revalidatePath("/dashboard/bookings");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xác nhận booking";
    throw new Error(errorMessage);
  }
}

/**
 * Cancel booking (update status and cancel pending payments)
 */
export async function cancelBookingAction(bookingId: string) {
  try {
    const supabase = await createClient();

    // Update booking status
    await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CANCELLED);

    // Get all payments for this booking
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", bookingId);

    if (fetchError) {
      console.error("Error fetching payments:", fetchError);
      // Don't throw error here, booking is already cancelled
      // Just log the error
      return;
    }

    if (!payments || payments.length === 0) {
      // No payments to update
      return;
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

    // Revalidate bookings page after cancelling
    revalidatePath("/dashboard/bookings");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể hủy booking";
    throw new Error(errorMessage);
  }
}

/**
 * Transfer booking (update room, check-in, check-out, advance_payment and handle payments)
 */
export async function transferBookingAction(
  bookingId: string,
  input: TransferBookingInput
) {
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

    // Revalidate bookings page after transferring
    revalidatePath("/dashboard/bookings");

    return updatedBooking as BookingRecord;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể chuyển phòng";
    throw new Error(errorMessage);
  }
}
