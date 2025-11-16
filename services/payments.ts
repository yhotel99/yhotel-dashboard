import { createClient } from "@/lib/supabase/client";
import type { Payment, PaymentInput } from "@/lib/types";
import { PAYMENT_STATUS } from "@/lib/constants";

/**
 * Create a payment record for a booking
 * @param paymentData - Payment input data
 * @returns Created payment record or null if error
 */
export async function createPayment(
  paymentData: PaymentInput
): Promise<Payment | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: paymentData.booking_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method || "bank_transfer",
        payment_status: paymentData.payment_status || PAYMENT_STATUS.PENDING,
        paid_at: paymentData.paid_at || null,
        verified_at: paymentData.verified_at || null,
        refunded_at: paymentData.refunded_at || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating payment:", error);
      return null;
    }

    return data as Payment;
  } catch (err) {
    console.error("Error creating payment:", err);
    return null;
  }
}

/**
 * Get payment by booking ID
 * @param bookingId - The booking ID to fetch payment for
 * @returns Payment record or null if not found or error
 */
export async function getPaymentByBookingId(
  bookingId: string
): Promise<Payment | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Payment;
  } catch (err) {
    console.error("Error fetching payment:", err);
    return null;
  }
}

/**
 * Update payment status
 * @param paymentId - The payment ID to update
 * @param paymentStatus - New payment status
 * @param additionalData - Optional additional fields (paid_at, verified_at, refunded_at)
 * @returns Updated payment record or null if error
 */
export async function updatePaymentStatus(
  paymentId: string,
  paymentStatus: Payment["payment_status"],
  additionalData?: {
    paid_at?: string | null;
    verified_at?: string | null;
    refunded_at?: string | null;
  }
): Promise<Payment | null> {
  try {
    const supabase = createClient();

    // Check current payment status - if already refunded, cannot change
    const { data: currentPayment, error: fetchError } = await supabase
      .from("payments")
      .select("payment_status")
      .eq("id", paymentId)
      .single();

    if (fetchError || !currentPayment) {
      console.error("Error fetching payment:", fetchError);
      return null;
    }

    // If payment is already refunded, cannot change status
    if (currentPayment.payment_status === "refunded") {
      throw new Error(
        "Không thể thay đổi trạng thái payment đã được hoàn tiền"
      );
    }

    const updateData: Partial<Payment> = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (additionalData?.paid_at !== undefined) {
      updateData.paid_at = additionalData.paid_at;
    }
    if (additionalData?.verified_at !== undefined) {
      updateData.verified_at = additionalData.verified_at;
    }
    if (additionalData?.refunded_at !== undefined) {
      updateData.refunded_at = additionalData.refunded_at;
    }

    const { data, error } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", paymentId)
      .select()
      .single();

    if (error || !data) {
      console.error("Error updating payment:", error);
      return null;
    }

    return data as Payment;
  } catch (err) {
    console.error("Error updating payment:", err);
    return null;
  }
}

/**
 * Get all payments for a booking
 * @param bookingId - The booking ID to fetch payments for
 * @returns Array of payment records
 */
export async function getPaymentsByBookingId(
  bookingId: string
): Promise<Payment[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as Payment[];
  } catch (err) {
    console.error("Error fetching payments:", err);
    return [];
  }
}
