"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS, PAYMENT_TYPE, REPORTING_STATUS } from "@/lib/constants";
import type { PaymentWithBooking } from "@/lib/types";
import { logPaymentUpdate } from "@/lib/audit-helpers";

/**
 * Check advance payment status by booking ID
 * @param bookingId - Booking ID
 * @returns Object with advance payment status information
 */
export async function checkAdvancePaymentStatusAction(
  bookingId: string
): Promise<{
  hasAdvancePayment: boolean;
  isPaid: boolean;
  paymentId: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", bookingId)
      .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT)
      .single();

    if (error) {
      // Not found is not an error, just means no advance payment
      if (error.code === "PGRST116") {
        return {
          hasAdvancePayment: false,
          isPaid: false,
          paymentId: null,
        };
      }
      throw new Error("Không thể kiểm tra trạng thái đặt cọc. Vui lòng thử lại.");
    }

    if (!data) {
      return {
        hasAdvancePayment: false,
        isPaid: false,
        paymentId: null,
      };
    }

    return {
      hasAdvancePayment: true,
      isPaid: data.payment_status === PAYMENT_STATUS.PAID,
      paymentId: data.id,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể kiểm tra trạng thái đặt cọc";
    throw new Error(errorMessage);
  }
}

/**
 * Mark advance payment as paid
 * @param bookingId - Booking ID
 */
export async function markAdvancePaymentAsPaidAction(
  bookingId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get payment info (only needed fields)
    const { data: payment } = await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", bookingId)
      .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT)
      .single();

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: now,
        reporting_status: REPORTING_STATUS.INCLUDED,
      })
      .eq("booking_id", bookingId)
      .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT);

    if (error) {
      if (error.code === "23503") {
        throw new Error("Không thể cập nhật thanh toán vì có dữ liệu liên quan bị thiếu.");
      }
      throw new Error("Không thể đánh dấu đặt cọc đã thanh toán. Vui lòng thử lại.");
    }

    // Log audit trail
    if (payment) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logPaymentUpdate(
          payment.id,
          user.id,
          user.email!,
          { payment_status: payment.payment_status },
          {
            payment_status: PAYMENT_STATUS.PAID,
            paid_at: now,
            reporting_status: REPORTING_STATUS.INCLUDED,
          },
          { bookingId, paymentType: PAYMENT_TYPE.ADVANCE_PAYMENT }
        );
      }
    }

    // Revalidate payments page after updating
    revalidatePath("/dashboard/payments");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể đánh dấu đặt cọc";
    throw new Error(errorMessage);
  }
}

/**
 * Get payments by booking ID
 * @param bookingId - Booking ID
 * @returns Array of payment records
 */
export async function getPaymentsByBookingIdAction(
  bookingId: string
): Promise<PaymentWithBooking[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select(
        `
        *,
        bookings:booking_id (
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        )
      `
      )
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Không thể tải danh sách thanh toán. Vui lòng thử lại.");
    }

    return (data || []) as PaymentWithBooking[];
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách thanh toán";
    throw new Error(errorMessage);
  }
}
