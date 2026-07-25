"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingInput,
  MultiBookingInput,
  UpdateBookingInput,
  BookingStatus,
  BookingRecord,
  Result,
  ResultVoid,
  BookingForTransactionalEmail,
  BookingEmailBookingRoomsJoinRow,
  BookingRoomDetail,
  ConfirmBookingEmailOptions,
} from "@/lib/types";
import type { RegistrationFormData } from "@/lib/booking-registration/types";
import { BOOKING_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { mapBookingError, formatDateTimePretty } from "@/lib/functions";
import { logBookingCreate, logBookingUpdate, logBookingCancel, logBookingAssignCreator } from "@/lib/audit-helpers";
import { getBookingRoomDetails, getBookingRegistrationData } from "@/services/bookings";
import { checkPermission } from "@/services/permissions";
import { getSettings } from "@/services/settings";
import { getResendClient, getResendFromAddress } from "@/lib/email/resend";
import { renderCancelBookingHTML } from "@/lib/email/templates/cancel-booking";
import { renderBookingConfirmationHTML } from "@/lib/email/templates/confirm-booking";



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

/** Server action: phòng + tổng tiền từng phòng khi xem chi tiết booking. */
export async function getBookingRoomDetailsAction(
  bookingId: string
): Promise<Result<BookingRoomDetail[]>> {
  try {
    return { ok: true, data: await getBookingRoomDetails(bookingId) };
  } catch (err) {
    console.error("Error fetching booking room details:", err);
    return {
      ok: false,
      message: "Không thể lấy thông tin phòng của booking",
    };
  }
}

/** Server action: dữ liệu giấy đăng ký đặt phòng (preview). */
export async function getBookingRegistrationFormAction(
  bookingId: string
): Promise<Result<RegistrationFormData>> {
  try {
    const data = await getBookingRegistrationData(bookingId);
    if (!data) {
      return { ok: false, message: "Không tìm thấy booking" };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("Error fetching registration form:", err);
    const message =
      err instanceof Error ? err.message : "Không thể tải giấy đăng ký";
    return { ok: false, message };
  }
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
      p_branch_code: input.branch_code?.trim() || null,
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
    p_branch_code: input.branch_code?.trim() || null,
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
 * Gắn hoặc đổi người tạo (created_by) của booking.
 * - created_by đang trống → cần permission assign:bookings
 * - đã có người tạo / xóa người tạo → cần permission update:booking-creator
 */
export async function assignBookingCreatorAction(
  bookingId: string,
  creatorId: string | null
): Promise<Result<BookingRecord>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Bạn cần đăng nhập" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return { ok: false, message: "Không tìm thấy thông tin người dùng" };
  }

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      created_by,
      branch_id,
      deleted_at,
      created_by_profile:profiles!bookings_created_by_fkey (
        full_name
      )
    `
    )
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError || !booking) {
    return { ok: false, message: "Không tìm thấy booking" };
  }

  const currentCreatorId = booking.created_by as string | null;
  const nextCreatorId = creatorId;

  if (currentCreatorId === nextCreatorId) {
    return { ok: false, message: "Người tạo không thay đổi" };
  }

  const isAssign = currentCreatorId == null && nextCreatorId != null;
  const isReassignOrClear = currentCreatorId != null;

  if (isAssign) {
    const canAssign = await checkPermission(
      profile.role,
      "assign",
      "bookings",
      supabase
    );
    if (!canAssign) {
      return {
        ok: false,
        message: "Bạn không có quyền gắn người tạo cho booking",
      };
    }
  } else if (isReassignOrClear) {
    const canUpdate = await checkPermission(
      profile.role,
      "update",
      "booking-creator",
      supabase
    );
    if (!canUpdate) {
      return {
        ok: false,
        message: "Bạn không có quyền sửa người tạo của booking",
      };
    }
  } else {
    // both null — already handled by equality check above
    return { ok: false, message: "Người tạo không thay đổi" };
  }

  let nextCreatorName: string | null = null;
  if (nextCreatorId) {
    const { data: creatorProfile, error: creatorError } = await supabase
      .from("profiles")
      .select("id, full_name, role, status, deleted_at")
      .eq("id", nextCreatorId)
      .is("deleted_at", null)
      .maybeSingle();

    if (creatorError || !creatorProfile) {
      return { ok: false, message: "Không tìm thấy người dùng được chọn" };
    }
    if (creatorProfile.status !== "active") {
      return { ok: false, message: "Chỉ có thể gắn người dùng đang hoạt động" };
    }
    if (creatorProfile.role !== "staff") {
      return {
        ok: false,
        message: "Chỉ có thể gắn nhân viên (staff) làm người tạo booking",
      };
    }
    nextCreatorName = creatorProfile.full_name;
  }

  type CreatorProfileJoin = { full_name: string | null } | { full_name: string | null }[] | null;
  const beforeProfile = booking.created_by_profile as CreatorProfileJoin;
  const beforeName = Array.isArray(beforeProfile)
    ? beforeProfile[0]?.full_name ?? null
    : beforeProfile?.full_name ?? null;

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ created_by: nextCreatorId })
    .eq("id", bookingId)
    .is("deleted_at", null)
    .select(
      `
      *,
      customers:customer_id (
        id,
        full_name,
        phone,
        email
      ),
      created_by_profile:profiles!bookings_created_by_fkey (
        full_name
      ),
      rooms:room_id (
        id,
        name
      )
    `
    )
    .single();

  if (updateError || !updated) {
    console.error("Error assigning booking creator:", updateError);
    return { ok: false, message: "Không thể cập nhật người tạo" };
  }

  await logBookingAssignCreator(
    bookingId,
    user.id,
    user.email ?? "",
    { created_by: currentCreatorId, creator_name: beforeName },
    { created_by: nextCreatorId, creator_name: nextCreatorName },
    {
      branchId: booking.branch_id as string | null,
      bookingCode: (updated as BookingRecord).booking_code,
    }
  );

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/audit-logs");

  return { ok: true, data: updated as BookingRecord };
}

/**
 * Update booking status
 */
export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus
): Promise<ResultVoid> {
  const additionalData: {
    actual_check_in?: string;
    actual_check_out?: string;
  } = {};

  if (status === BOOKING_STATUS.CHECKED_IN) {
    additionalData.actual_check_in = new Date().toISOString();
  }
  if (status === BOOKING_STATUS.CHECKED_OUT) {
    additionalData.actual_check_out = new Date().toISOString();
  }

  const result = await updateBookingStatusInternal(
    bookingId,
    status,
    Object.keys(additionalData).length > 0 ? additionalData : undefined
  );
  
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

export type CancelBookingActionOptions = {
  /** Gửi email thông báo hủy cho khách. Mặc định true. */
  sendCancellationEmail?: boolean;
};

/**
 * Cancel booking (update status, cancel pending payments, exclude paid payments from reports)
 */
export async function cancelBookingAction(
  bookingId: string,
  options?: CancelBookingActionOptions
): Promise<ResultVoid> {
  const supabase = await createClient();
  const sendCancellationEmail = options?.sendCancellationEmail !== false;

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
  if (!sendCancellationEmail) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await logBookingCancel(
        bookingId,
        user.id,
        user.email!,
        "Cancelled by user",
        { action: "cancel_booking", send_cancellation_email: false }
      );
    }
    revalidatePath("/dashboard/bookings");
    return { ok: true };
  }

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
        const bookingData = booking as unknown as BookingForTransactionalEmail;

        const settings = await getSettings();

        const hotelName = settings?.site_title || "YHotel";
        const hotline = settings?.contact_phone || "0787 913 388";
        const supportEmail = settings?.contact_email || "hello@yhotel.vn";

        const customerRaw = bookingData.customer;
        const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
        const customerEmail: string | undefined = customer?.email ?? undefined;
        const customerName: string | undefined = customer?.full_name ?? undefined;

        const roomNames = (bookingData.booking_rooms ?? [])
          .map((br: BookingEmailBookingRoomsJoinRow) => {
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
      "Cancelled by user",
      { action: "cancel_booking", send_cancellation_email: true }
    );
  }

  // Revalidate bookings page after cancelling
  revalidatePath("/dashboard/bookings");

  return { ok: true };
}

/**
 * Xác nhận booking (RPC) và gửi email xác nhận qua Resend — logic trước đây ở edge function send-confirm-booking.
 */
export async function confirmBookingEmailAction(
  bookingCode: string,
  options?: ConfirmBookingEmailOptions
): Promise<ResultVoid> {
  const code = bookingCode?.trim();
  if (!code) {
    return { ok: false, message: "Thiếu mã booking" };
  }

  const sendConfirmationEmail = options?.sendConfirmationEmail !== false;
  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      booking_code,
      check_in,
      check_out,
      total_amount,
      final_amount,
      number_of_nights,
      total_guests,
      advance_payment,
      notes,
      branch_id,
      branch:branch_id(name, address),
      customer:customer_id(email, full_name, phone),
      booking_rooms(
        room:room_id(name, room_number),
        amount
      )
    `
    )
    .eq("booking_code", code)
    .single();

  if (fetchError || !booking) {
    console.error("Confirm booking — fetch error:", fetchError);
    return { ok: false, message: "Không tìm thấy booking" };
  }

  const { error: rpcError } = await supabase.rpc("confirm_booking_secure", {
    p_booking_id: booking.id,
  });

  if (rpcError) {
    console.error("confirm_booking_secure error:", rpcError);
    return { ok: false, message: "Không thể xác nhận booking" };
  }

  if (!sendConfirmationEmail) {
    revalidatePath("/dashboard/bookings");
    return { ok: true };
  }

  const bookingData = booking as unknown as BookingForTransactionalEmail;

  try {
    const resend = getResendClient();
    if (!resend) {
      revalidatePath("/dashboard/bookings");
      return { ok: true };
    }

    const customerRaw = bookingData.customer;
    const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
    const customerEmail = customer?.email?.trim();
    if (!customerEmail) {
      console.warn("Confirm booking — no customer email, skip send");
      revalidatePath("/dashboard/bookings");
      return { ok: true };
    }

    const settings = await getSettings();
    const hotelName = settings?.site_title || "YHotel";
    const hotline = settings?.contact_phone || "0787 913 388";
    const supportEmail = settings?.contact_email || "hello@yhotel.vn";

    const branchRaw = bookingData.branch;
    const branch = Array.isArray(branchRaw) ? branchRaw[0] : branchRaw;
    const hotelAddress =
      branch?.address?.trim() || settings?.contact_address?.trim() || null;

    const roomLabels: string[] = [];
    for (const br of bookingData.booking_rooms ?? []) {
      const roomRaw = br.room;
      const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
      const name = room?.name?.trim() || "";
      const number = room?.room_number?.trim() || "";
      if (name && number) roomLabels.push(`${name} (${number})`);
      else if (name) roomLabels.push(name);
      else if (number) roomLabels.push(`Phòng ${number}`);
    }
    const roomType = roomLabels.length ? roomLabels.join("\n") : "-";

    const html = renderBookingConfirmationHTML({
      customer_name: customer?.full_name?.trim() || "Quý khách",
      hotel_name: hotelName,
      booking_code: bookingData.booking_code,
      room_type: roomType,
      check_in: formatDateTimePretty(bookingData.check_in, {
        format: "full",
      }),
      check_out: formatDateTimePretty(bookingData.check_out, {
        format: "full",
      }),
      total_price:
        Number(bookingData.final_amount ?? bookingData.total_amount) || 0,
      hotline,
      support_email: supportEmail,
      hotel_address: hotelAddress,
      branch_name: branch?.name?.trim() || null,
      number_of_nights: bookingData.number_of_nights ?? null,
      total_guests: bookingData.total_guests ?? null,
      customer_phone: customer?.phone?.trim() || null,
      customer_email: customerEmail,
      payment_status_label: "Đã xác nhận",
      advance_payment:
        bookingData.advance_payment != null
          ? Number(bookingData.advance_payment)
          : null,
      notes: bookingData.notes?.trim() || null,
    });

    await resend.emails.send({
      from: getResendFromAddress(),
      to: customerEmail,
      subject: `Xác nhận đặt phòng – ${bookingData.booking_code}`,
      html,
    });
  } catch (emailErr) {
    console.error("Send confirmation email failed:", emailErr);
  }

  revalidatePath("/dashboard/bookings");
  return { ok: true };
}