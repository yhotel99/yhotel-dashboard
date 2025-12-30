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
import { BOOKING_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { formatDateTimePretty } from "@/lib/functions";

/**
 * Create booking using secure RPC function
 */
async function createBookingSecure(input: BookingInput): Promise<string> {
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
        p_payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
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
): Promise<void> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = { status };

    if (additionalData?.actual_check_in !== undefined) {
      updateData.actual_check_in = additionalData.actual_check_in;
    }
    if (additionalData?.actual_check_out !== undefined) {
      updateData.actual_check_out = additionalData.actual_check_out;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      throw new Error(error.message);
    }
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
    // Create booking using secure RPC function
    const bookingId = await createBookingSecure(input);

    // Revalidate bookings page after creating
    revalidatePath("/dashboard/bookings");

    return bookingId;
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

    if (!data) {
      throw new Error("Không thể cập nhật booking");
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
 * Check in booking (update status to checked_in and set actual_check_in)
 */
export async function checkInBookingAction(bookingId: string) {
  try {
    const now = new Date().toISOString();
    await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_IN, {
      actual_check_in: now,
    });
    // Revalidate bookings page after check in
    revalidatePath("/dashboard/bookings");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể check in booking";
    throw new Error(errorMessage);
  }
}

/**
 * Check out booking (update status to checked_out and set actual_check_out)
 */
export async function checkOutBookingAction(bookingId: string) {
  try {
    const now = new Date().toISOString();
    await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_OUT, {
      actual_check_out: now,
    });

    // Revalidate bookings page after check out
    revalidatePath("/dashboard/bookings");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể check out booking";
    throw new Error(errorMessage);
  }
}

/**
 * Confirm booking (update status and mark payments as paid)
 */
export async function confirmBookingAction(bookingId: string) {
  try {
    const supabase = await createClient();
    type BookingWithCustomer = {
      id: string;
      room: {
        name: string;
      } | null;
      check_in: string;
      check_out: string;
      customer: {
        email: string;
        full_name: string;
      } | null;
    };

    const { error } = await supabase.rpc("confirm_booking_secure", {
      p_booking_id: bookingId,
    });


    if (error) {
      console.error("Error confirming booking:", error);
      throw new Error(error.message);
    }

    // Send email to customer
 
    // 2️⃣ Lấy thông tin booking + customer
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        room:room_id (
          name
        ),
        check_in,
        check_out,
        customer:customer_id (
          email,
          full_name
        )
      `
      )
      .eq("id", bookingId)
      .single() as { data: BookingWithCustomer; error: Error | null };

    if (bookingError) {
      console.error("Error fetching booking:", bookingError);
      throw new Error(bookingError.message);
    }

    if (!booking) throw new Error("Không tìm thấy booking");

    console.log("booking", booking);
    
    // // 3️⃣ Gửi email xác nhận qua Edge Function
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email-confirm-booking`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          customer_name: booking.customer?.full_name || "-",
          customer_email: booking.customer?.email || "-",
          booking_code: booking.id,
          room_name: booking.room?.name || "-",
          check_in: formatDateTimePretty(booking.check_in),
          check_out: formatDateTimePretty(booking.check_out),
        }),
        cache: "no-store",
      }
    );

    const emailResult = await res.json();

    if (!res.ok) {
      console.error("Send email failed", emailResult);
      // optional: không throw để không chặn confirm booking
    }

    // Revalidate bookings page after confirming
    revalidatePath("/dashboard/bookings");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xác nhận booking";
    throw new Error(errorMessage);
  }
}

// export async function confirmBookingAction(bookingCode: string) {
//     await fetch("/functions/v1/send-confirm-booking", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ booking_code: bookingCode }),
//     });

//     revalidatePath("/dashboard/bookings");
// }

/**
 * Cancel booking (update status and cancel pending payments)
 */
export async function cancelBookingAction(bookingId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("cancel_booking_secure", {
      p_booking_id: bookingId,
    });

    if (error) {
      console.error("Error cancelling booking:", error);
      throw new Error(error.message);
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
  console.log("transferBookingAction", bookingId, input);
}
