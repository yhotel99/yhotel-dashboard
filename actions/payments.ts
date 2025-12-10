"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  Payment,
} from "@/lib/types";
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants";

/**
 * Create payment
 * @param input - Payment input data
 */
export async function createPaymentAction(input: {
  booking_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
}): Promise<Payment> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: input.booking_id,
        amount: input.amount,
        payment_type: input.payment_type,
        payment_method: input.payment_method || PAYMENT_METHOD.PAY_AT_HOTEL,
        payment_status: input.payment_status || PAYMENT_STATUS.PENDING,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate payments page after creating
    revalidatePath("/dashboard/payments");

    return data as Payment;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo payment";
    throw new Error(errorMessage);
  }
}

/**
 * Update payment status
 * @param paymentId - Payment ID
 * @param status - New payment status
 * @param paidAt - Paid at timestamp (optional)
 */
export async function updatePaymentStatusAction(
  paymentId: string,
  status: PaymentStatus,
  paidAt?: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    const updateData: {
      payment_status: string;
      paid_at?: string | null;
    } = {
      payment_status: status,
    };

    if (status === PAYMENT_STATUS.PAID && paidAt) {
      updateData.paid_at = paidAt;
    } else if (status !== PAYMENT_STATUS.PAID) {
      updateData.paid_at = null;
    }

    const { error } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", paymentId);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate payments page after updating
    revalidatePath("/dashboard/payments");
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái payment";
    throw new Error(errorMessage);
  }
}

/**
 * Update payment status by booking ID
 * @param bookingId - Booking ID
 * @param status - New payment status
 * @param paidAt - Paid at timestamp (optional)
 */
export async function updatePaymentStatusByBookingIdAction(
  bookingId: string,
  status: PaymentStatus,
  paidAt?: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    const updateData: {
      payment_status: string;
      paid_at?: string | null;
    } = {
      payment_status: status,
    };

    if (status === PAYMENT_STATUS.PAID && paidAt) {
      updateData.paid_at = paidAt;
    } else if (status !== PAYMENT_STATUS.PAID) {
      updateData.paid_at = null;
    }

    const { error } = await supabase
      .from("payments")
      .update(updateData)
      .eq("booking_id", bookingId);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate payments page after updating
    revalidatePath("/dashboard/payments");
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái payment";
    throw new Error(errorMessage);
  }
}

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
