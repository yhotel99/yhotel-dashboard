"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  RefundRequestInput,
  RefundRequest,
  RefundRequestStatus,
} from "@/lib/types";
import { REFUND_REQUEST_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatVND } from "@/lib/functions";

/**
 * Calculate total refunded amount for a booking
 */
async function getTotalRefundedAmount(
  bookingId: string,
  excludeRefundRequestId?: string
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("refund_requests")
    .select("amount")
    .eq("booking_id", bookingId)
    .eq("status", REFUND_REQUEST_STATUS.REFUNDED);

  if (excludeRefundRequestId) {
    query = query.neq("id", excludeRefundRequestId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Không thể tính tổng đã hoàn tiền: ${error.message}`);
  }

  return (data || []).reduce((sum: number, refund: { amount: number }) => sum + (refund.amount || 0), 0);
}

/**
 * Get total paid amount for a booking
 */
async function getTotalPaidAmount(bookingId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("booking_id", bookingId)
    .eq("payment_status", PAYMENT_STATUS.PAID);

  if (error) {
    throw new Error(`Không thể tính tổng đã thanh toán: ${error.message}`);
  }

  return (data || []).reduce((sum: number, payment: { amount: number }) => sum + (payment.amount || 0), 0);
}

/**
 * Calculate available refund amount for a booking
 */
async function getAvailableRefundAmount(
  bookingId: string,
  excludeRefundRequestId?: string
): Promise<{ totalPaid: number; totalRefunded: number; available: number }> {
  const [totalPaidAmount, totalRefundedAmount] = await Promise.all([
    getTotalPaidAmount(bookingId),
    getTotalRefundedAmount(bookingId, excludeRefundRequestId),
  ]);
  return {
    totalPaid: totalPaidAmount,
    totalRefunded: totalRefundedAmount,
    available: Math.max(0, totalPaidAmount - totalRefundedAmount),
  };
}

/**
 * Validate refund amount against available refund amount
 */
function validateRefundAmount(
  amount: number,
  totalPaid: number,
  totalRefunded: number,
  available: number
): void {
  if (amount > available) {
    throw new Error(
      `Số tiền hoàn lại không được vượt quá số tiền có thể hoàn lại. ` +
        `Tổng đã thanh toán: ${formatVND(totalPaid)}, ` +
        `Đã hoàn tiền: ${formatVND(totalRefunded)}, ` +
        `Có thể hoàn lại: ${formatVND(available)}`
    );
  }
}

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

    // Validate refund amount
    const { totalPaid, totalRefunded, available } =
      await getAvailableRefundAmount(input.booking_id);

    validateRefundAmount(input.amount, totalPaid, totalRefunded, available);

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
 * Get refund requests by booking ID
 */
export async function getRefundRequestsByBookingIdAction(
  bookingId: string
): Promise<RefundRequest[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("refund_requests")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as RefundRequest[];
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách yêu cầu hoàn tiền";
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

    // If status is being changed to REFUNDED, validate total refunded amount
    if (status === REFUND_REQUEST_STATUS.REFUNDED) {
      const { data: refundRequest, error: fetchError } = await supabase
        .from("refund_requests")
        .select("amount, booking_id")
        .eq("id", id)
        .single();

      if (fetchError || !refundRequest) {
        throw new Error(
          fetchError?.message || "Không tìm thấy yêu cầu hoàn tiền"
        );
      }

      // Validate refund amount
      const { totalPaid, totalRefunded, available } =
        await getAvailableRefundAmount(refundRequest.booking_id, id);

      validateRefundAmount(
        refundRequest.amount,
        totalPaid,
        totalRefunded,
        available
      );
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
