"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingInput,
  UpdateBookingInput,
  TransferBookingInput,
  BookingStatus,
  BookingRecord,
  Result,
  ResultVoid,
} from "@/lib/types";
import { BOOKING_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { mapBookingError } from "@/lib/functions";



/**
 * Get booking by ID with full customer and room details for checkout
 * @param bookingId - Booking ID
 * @returns Booking record with full customer and room relations
 */
export async function getBookingByIdForCheckoutAction(
  bookingId: string
): Promise<Result<BookingRecord>> {
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
    console.error("Error fetching booking for checkout:", error);
    return {
      ok: false,
      message: "Không thể lấy thông tin booking",
    };
  }

  if (!data) {
    return {
      ok: false,
      message: "Không tìm thấy booking",
    };
  }

  return {
    ok: true,
    data: data as BookingRecord,
  };
}

/**
 * Update booking status (internal)
 */
async function updateBookingStatusInternal(
  bookingId: string,
  status: string,
  additionalData?: {
    actual_check_in?: string;
    actual_check_out?: string;
  }
): Promise<ResultVoid> {
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
    console.error("Error updating booking status:", error);
    return {
      ok: false,
      message: "Không thể cập nhật trạng thái booking",
    };
  }

  return { ok: true };
}

/**
 * Create booking with payments
 * Uses secure RPC function that returns JSON (không throw business errors)
 * Returns result object instead of throwing errors
 */
export async function createBooking(
  input: BookingInput
): Promise<Result<{ bookingId: string }>> {
  console.log("Starting booking creation process...");

  // Validate input data
  if (!input.customer_id) {
    return {
      ok: false,
      message: "Vui lòng chọn khách hàng",
    };
  }
  if (!input.room_id) {
    return {
      ok: false,
      message: "Vui lòng chọn phòng",
    };
  }
  if (!input.check_in || !input.check_out) {
    return {
      ok: false,
      message: "Vui lòng chọn ngày check-in và check-out",
    };
  }
  if (input.total_amount <= 0) {
    return {
      ok: false,
      message: "Tổng tiền phải lớn hơn 0",
    };
  }

  // Create booking using secure RPC function
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_booking_secure",
    {
      p_customer_id: input.customer_id ?? null,
      p_room_id: input.room_id ?? null,
      p_check_in: input.check_in,
      p_check_out: input.check_out,
      p_number_of_nights: input.number_of_nights ?? 0,
      p_total_amount: input.total_amount,
      p_payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
      p_total_guests: input.total_guests ?? 1,
      p_notes: input.notes ?? null,
      p_advance_payment: input.advance_payment ?? 0,
    }
  );

  if (error) {
    console.error("System DB error:", error);
    return {
      ok: false,
      message: "Hệ thống đang bận, vui lòng thử lại",
    };
  }

  if (!data?.ok) {
    return {
      ok: false,
      message: mapBookingError(data.error_code),
    };
  }

  // Revalidate bookings page after creating
  revalidatePath("/dashboard/bookings");

  console.log("Booking creation completed successfully");
  return {
    ok: true,
    data: { bookingId: data.booking_id },
  };
}

/**
 * Update booking
 */
export async function updateBooking(
  bookingId: string,
  input: UpdateBookingInput
): Promise<Result<BookingRecord>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update(input)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    console.error("Error updating booking:", error);
    return {
      ok: false,
      message: "Không thể cập nhật booking",
    };
  }

  if (!data) {
    return {
      ok: false,
      message: "Không tìm thấy booking để cập nhật",
    };
  }

  // Revalidate bookings page after updating
  revalidatePath("/dashboard/bookings");

  return {
    ok: true,
    data: data as BookingRecord,
  };
}

/**
 * Update booking status
 */
export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus
): Promise<ResultVoid> {
  const result = await updateBookingStatusInternal(bookingId, status);
  
  if (!result.ok) {
    return result;
  }

  // Revalidate bookings page after updating status
  revalidatePath("/dashboard/bookings");
  
  return { ok: true };
}

/**
 * Check in booking (update status to checked_in and set actual_check_in)
 */
export async function checkInBookingAction(
  bookingId: string
): Promise<ResultVoid> {
  const now = new Date().toISOString();
  const result = await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_IN, {
    actual_check_in: now,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: "Không thể check in booking",
    };
  }

  // Revalidate bookings page after check in
  revalidatePath("/dashboard/bookings");
  
  return { ok: true };
}

/**
 * Check out booking (update status to checked_out and set actual_check_out)
 */
export async function checkOutBookingAction(
  bookingId: string
): Promise<ResultVoid> {
  const now = new Date().toISOString();
  const result = await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_OUT, {
    actual_check_out: now,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: "Không thể check out booking",
    };
  }

  // Revalidate bookings page after check out
  revalidatePath("/dashboard/bookings");
  
  return { ok: true };
}

/**
 * Cancel booking (update status and cancel pending payments)
 */
export async function cancelBookingAction(
  bookingId: string
): Promise<ResultVoid> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_booking_secure", {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error("Error cancelling booking:", error);
    return {
      ok: false,
      message: "Không thể hủy booking",
    };
  }

  // Revalidate bookings page after cancelling
  revalidatePath("/dashboard/bookings");
  
  return { ok: true };
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


export async function confirmBookingEmailAction(bookingCode: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-confirm-booking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        booking_code: bookingCode,
      }),
      cache: "no-store",
    }
  );

  const emailResult = await res.json();
  console.log({
    emailResult,
    bookingCode,
  });

  if (!res.ok) {
    console.error("Send email failed", emailResult);
    // optional: không throw để không chặn confirm booking
  }

  // Revalidate bookings page after confirming
  revalidatePath("/dashboard/bookings");

}