"use server";

import { createClient } from "@/lib/supabase/server";
import type { RefundRequestInput, RefundRequest } from "@/lib/types";

/**
 * Create a new refund request
 */
export async function createRefundRequest(
  input: RefundRequestInput
): Promise<RefundRequest> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Không thể xác thực người dùng");
    }

    // Insert refund request
    const { data, error } = await supabase
      .from("refund_requests")
      .insert({
        booking_id: input.booking_id,
        payment_id: input.payment_id,
        customer_id: input.customer_id,
        request_by: user.id,
        reason: input.reason || null,
        note: input.note || null,
        amount: input.amount,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as RefundRequest;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo yêu cầu hoàn tiền";
    throw new Error(errorMessage);
  }
}
