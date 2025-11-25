import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/types";

/**
 * Get payments by booking ID
 * @param bookingId - Booking ID
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

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Payment[];
  } catch (err) {
    console.error("Error fetching payments by booking ID:", err);
    throw err;
  }
}
