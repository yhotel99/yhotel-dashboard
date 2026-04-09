"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingInput,
  MultiBookingInput,
  UpdateBookingInput,
  TransferBookingInput,
  BookingStatus,
  BookingRecord,
  Result,
  ResultVoid,
} from "@/lib/types";
import { BOOKING_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { mapBookingError, formatDateTimePretty } from "@/lib/functions";
import { logBookingCreate, logBookingUpdate, logBookingCancel } from "@/lib/audit-helpers";
import { getSettings } from "@/services/settings";
import { getResendClient, getResendFromAddress } from "@/lib/email/resend";
import { renderCancelBookingHTML } from "@/lib/email/templates/cancel-booking";



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
  
  // Get old status
  const { data: oldData } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();

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

  // Log audit trail
  const { data: { user } } = await supabase.auth.getUser();
  if (user && oldData) {
    await logBookingUpdate(
      bookingId,
      user.id,
      user.email!,
      { status: oldData.status },
      updateData,
      { 
        action: 'status_change',
        ...additionalData 
      }
    );
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
      p_payment_method: input.payment_method ?? PAYMENT_METHOD.PAY_AT_HOTEL,
      p_total_guests: input.total_guests ?? 1,
      p_notes: input.notes ?? null,
      p_advance_payment: input.advance_payment ?? 0,
      p_final_amount: input.final_amount ?? null,
      p_voucher_code: input.voucher_code ?? null,
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

  // Log audit trail
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logBookingCreate(data.booking_id, user.id, user.email!, {
      mode: "single",
      roomId: input.room_id ?? null,
      customerId: input.customer_id ?? null,
      checkIn: input.check_in,
      checkOut: input.check_out,
      totalAmount: input.total_amount,
      finalAmount: input.final_amount ?? null,
      voucherCode: input.voucher_code ?? null,
    });
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
 * Create multi-room booking (nhiều phòng, thanh toán 1 lần)
 * Uses create_multi_booking_secure RPC
 */
export async function createMultiBooking(
  input: MultiBookingInput
): Promise<Result<{ bookingId: string }>> {
  if (!input.customer_id) {
    return { ok: false, message: "Vui lòng chọn khách hàng" };
  }
  if (!input.room_items?.length) {
    return { ok: false, message: "Vui lòng chọn ít nhất một phòng" };
  }
  if (!input.check_in || !input.check_out) {
    return { ok: false, message: "Vui lòng chọn ngày check-in và check-out" };
  }

  const supabase = await createClient();
  const roomItemsJson = input.room_items.map((item) => ({
    room_id: item.room_id,
    amount: item.amount,
  }));

  const { data, error } = await supabase.rpc("create_multi_booking_secure", {
    p_customer_id: input.customer_id,
    p_room_items: roomItemsJson,
    p_check_in: input.check_in,
    p_check_out: input.check_out,
    p_number_of_nights: input.number_of_nights,
    p_total_guests: input.total_guests ?? 1,
    p_notes: input.notes ?? null,
    p_payment_method: input.payment_method ?? PAYMENT_METHOD.PAY_AT_HOTEL,
    p_advance_payment: input.advance_payment ?? 0,
    p_final_amount: input.final_amount ?? null,
    p_voucher_code: input.voucher_code ?? null,
  });

  if (error) {
    console.error("System DB error:", error);
    return { ok: false, message: "Hệ thống đang bận, vui lòng thử lại" };
  }

  if (!data?.ok) {
    return {
      ok: false,
      message: mapBookingError(data.error_code ?? "UNKNOWN"),
    };
  }

  // Log audit trail
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logBookingCreate(data.booking_id, user.id, user.email!, {
      mode: "multi",
      customerId: input.customer_id,
      roomItems: input.room_items,
      checkIn: input.check_in,
      checkOut: input.check_out,
      finalAmount: input.final_amount ?? null,
      voucherCode: input.voucher_code ?? null,
    });
  }

  revalidatePath("/dashboard/bookings");
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
  const hasFinalAmount =
    input.final_amount !== undefined && input.final_amount !== null;

  // Get old data (only fields being updated)
  const fieldsToSelect = Object.keys(input).join(",");
  const { data: oldData } = await supabase
    .from("bookings")
    .select(fieldsToSelect)
    .eq("id", bookingId)
    .single();

  let updatedBooking: BookingRecord | null = null;

  if (hasFinalAmount) {
    // Use transactional RPC when final_amount is being changed
    const { data, error } = await supabase.rpc(
      "update_booking_final_amount_secure",
      {
        p_booking_id: bookingId,
        p_final_amount: input.final_amount,
        p_total_guests: input.total_guests ?? null,
        p_notes: input.notes ?? null,
      }
    );

    if (error) {
      console.error("Error updating booking via RPC:", error);
      return {
        ok: false,
        message: "Không thể cập nhật booking",
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: mapBookingError(data.error_code ?? "UNKNOWN"),
      };
    }

    updatedBooking = data.booking as BookingRecord;
  } else {
    // Simple path: direct update without touching payments
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

    updatedBooking = data as BookingRecord;
  }

  // Log audit trail
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logBookingUpdate(
      bookingId,
      user.id,
      user.email!,
      oldData || {},
      input,
      { updatedFields: Object.keys(input) }
    );
  }

  // Revalidate bookings page after updating
  revalidatePath("/dashboard/bookings");

  return {
    ok: true,
    data: updatedBooking as BookingRecord,
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

  // Send cancellation email (do not block cancellation if email fails)
  try {
    const resend = getResendClient();
    if (resend) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          booking_code,
          check_in,
          check_out,
          total_amount,
          final_amount,
          customer:customer_id(full_name,email),
          booking_rooms(
            room:room_id(name)
          )
        `
        )
        .eq("id", bookingId)
        .single();

      if (!bookingError && booking) {
        type BookingCustomerRow = { full_name: string | null; email: string | null };
        type BookingRoomRow = { name: string | null };
        type BookingRoomsJoinRow = {
          room: BookingRoomRow | BookingRoomRow[] | null;
        };
        type BookingForCancellationEmail = {
          booking_code: string;
          check_in: string;
          check_out: string;
          total_amount: number;
          final_amount?: number | null;
          customer: BookingCustomerRow | BookingCustomerRow[] | null;
          booking_rooms: BookingRoomsJoinRow[] | null;
        };

        const bookingData = booking as unknown as BookingForCancellationEmail;

        const settings = await getSettings();

        const hotelName = settings?.site_title || "YHotel";
        const hotline = settings?.contact_phone || "0787 913 388";
        const supportEmail = settings?.contact_email || "hello@yhotel.vn";

        const customerRaw = bookingData.customer;
        const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
        const customerEmail: string | undefined = customer?.email ?? undefined;
        const customerName: string | undefined = customer?.full_name ?? undefined;

        const roomNames = (bookingData.booking_rooms ?? [])
          .map((br: BookingRoomsJoinRow) => {
            const roomRaw = br.room;
            const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
            return room?.name ?? undefined;
          })
          .filter(
            (name: unknown): name is string =>
              typeof name === "string" && name.trim().length > 0
          );

        const roomType = roomNames.length ? roomNames.join(", ") : "-";

        if (!customerEmail) {
          throw new Error("Missing customer email for cancellation email");
        }

        const html = renderCancelBookingHTML({
          customer_name: customerName || "Quý khách",
          hotel_name: hotelName,
          booking_code: bookingData.booking_code,
          room_type: roomType,
          check_in: formatDateTimePretty(bookingData.check_in, {
            showIcons: false,
            format: "full",
          }),
          check_out: formatDateTimePretty(bookingData.check_out, {
            showIcons: false,
            format: "full",
          }),
          total_price: Number(bookingData.final_amount ?? bookingData.total_amount) || 0,
          hotline,
          support_email: supportEmail,
        });

        await resend.emails.send({
          from: getResendFromAddress(),
          to: customerEmail,
          subject: `Thông báo hủy phòng – ${bookingData.booking_code}`,
          html,
        });
      }
    }
  } catch (emailErr) {
    console.error("Send cancellation email failed:", emailErr);
  }

  // Log audit trail
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await logBookingCancel(
      bookingId,
      user.id,
      user.email!,
      'Cancelled by user',
      { action: 'cancel_booking' }
    );
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