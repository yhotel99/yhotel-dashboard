"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  RefundRequestInput,
  RefundRequest,
  RefundRequestStatus,
} from "@/lib/types";
import { REFUND_REQUEST_STATUS, PAYMENT_STATUS } from "@/lib/constants";

/**
 * Create a new refund request
 */
export async function createRefundRequestAction(
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
        status: REFUND_REQUEST_STATUS.PENDING,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate refund requests page
    revalidatePath("/dashboard/refund-requests");

    return data as RefundRequest;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo yêu cầu hoàn tiền";
    throw new Error(errorMessage);
  }
}

/**
 * Update refund request status
 */
export async function updateRefundRequestStatusAction(
  id: string,
  status: RefundRequestStatus
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

    const { data, error } = await supabase.rpc("update_refund_request_status", {
      p_refund_request_id: id,
      p_status: status,
      p_user_id: user.id,
    });

    if (error) throw new Error(error.message);

    // Revalidate refund requests page
    revalidatePath("/dashboard/refund-requests");

    return data as RefundRequest;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái yêu cầu hoàn tiền";
    throw new Error(errorMessage);
  }
}
