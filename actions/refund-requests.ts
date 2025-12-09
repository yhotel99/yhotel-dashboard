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

    // Fetch refund request to get payment_id
    const { data: refundRequest, error: fetchError } = await supabase
      .from("refund_requests")
      .select("payment_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const updateData: {
      status: RefundRequestStatus;
      approved_by?: string | null;
      refunded_by?: string | null;
    } = {
      status,
    };

    // Set approved_by if status is approved
    if (status === REFUND_REQUEST_STATUS.APPROVED) {
      updateData.approved_by = user.id;
    }

    // Set refunded_by if status is refunded
    if (status === REFUND_REQUEST_STATUS.REFUNDED) {
      updateData.refunded_by = user.id;
    }

    const { data, error } = await supabase
      .from("refund_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update payment status to REFUNDED when refund request is refunded
    if (
      status === REFUND_REQUEST_STATUS.REFUNDED &&
      refundRequest?.payment_id
    ) {
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({ payment_status: PAYMENT_STATUS.REFUNDED })
        .eq("id", refundRequest.payment_id);

      if (paymentUpdateError) {
        console.error("Error updating payment status:", paymentUpdateError);
        // Don't throw error here, refund request is already updated
        // Just log the error
      }
    }

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

/**
 * Delete refund request (soft delete)
 */
export async function deleteRefundRequestAction(id: string): Promise<void> {
  try {
    const supabase = await createClient();

    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from("refund_requests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate refund requests page
    revalidatePath("/dashboard/refund-requests");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa yêu cầu hoàn tiền";
    throw new Error(errorMessage);
  }
}
