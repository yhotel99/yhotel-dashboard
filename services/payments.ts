import { createClient } from "@/lib/supabase/client";
import type { Payment, PaymentInput } from "@/lib/types";
import { PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants";

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
        payment_type: paymentData.payment_type,
        payment_method:
          paymentData.payment_method || PAYMENT_METHOD.PAY_AT_HOTEL,
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
 * Update payment amount
 * @param paymentId - The payment ID to update
 * @param amount - New amount
 * @returns Updated payment record or null if error
 */
export async function updatePaymentAmount(
  paymentId: string,
  amount: number
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

    // If payment is already refunded, cannot change amount
    if (currentPayment.payment_status === "refunded") {
      throw new Error(
        "Không thể thay đổi số tiền của payment đã được hoàn tiền"
      );
    }

    const { data, error } = await supabase
      .from("payments")
      .update({
        amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .select()
      .single();

    if (error || !data) {
      console.error("Error updating payment amount:", error);
      return null;
    }

    return data as Payment;
  } catch (err) {
    console.error("Error updating payment amount:", err);
    throw err;
  }
}

/**
 * Delete a payment record
 * @param paymentId - The payment ID to delete
 * @returns True if deleted successfully, false otherwise
 */
export async function deletePayment(paymentId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      console.error("Error deleting payment:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error deleting payment:", err);
    return false;
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

/**
 * Extended Payment type with booking relation
 */
export type PaymentWithBooking = Payment & {
  bookings?: {
    id: string;
    customer_id: string | null;
    room_id: string | null;
    check_in: string;
    check_out: string;
    status: string;
    customers?: {
      id: string;
      full_name: string;
    } | null;
    rooms?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

/**
 * Search payments with pagination and booking relations
 * @param search - Search term (searches in payment ID and booking ID)
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object with payments array and total count
 */
export async function searchPayments(
  search: string | null,
  page: number,
  limit: number
): Promise<{ payments: PaymentWithBooking[]; total: number }> {
  try {
    const supabase = createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with booking relation
    let query = supabase.from("payments").select(
      `
        *,
        bookings (
          id,
          customer_id,
          room_id,
          check_in,
          check_out,
          status,
          customers (
            id,
            full_name
          ),
          rooms (
            id,
            name
          )
        )
      `,
      { count: "exact" }
    );

    // Add search filter if search term exists
    // Search in payment ID and booking ID
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `id.ilike.%${trimmedSearch}%,booking_id.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const paymentsData = (data || []) as PaymentWithBooking[];
    const total = count || 0;

    return {
      payments: paymentsData,
      total,
    };
  } catch (err) {
    console.error("Error searching payments:", err);
    throw err;
  }
}
