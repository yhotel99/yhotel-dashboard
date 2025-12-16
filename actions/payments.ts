"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants";

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
      throw new Error(error.message);
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
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: now,
      })
      .eq("booking_id", bookingId)
      .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate payments page after updating
    revalidatePath("/dashboard/payments");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể đánh dấu đặt cọc";
    throw new Error(errorMessage);
  }
}
