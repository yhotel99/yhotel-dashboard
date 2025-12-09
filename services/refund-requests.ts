"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  RefundRequestInput,
  RefundRequest,
  RefundRequestStatus,
  RefundRequestWithRelations,
} from "@/lib/types";
import { REFUND_REQUEST_STATUS, PAYMENT_STATUS } from "@/lib/constants";

/**
 * Search refund requests with pagination and search (Client-side)
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object containing refund requests array and total count
 */
export async function searchRefundRequests({
  search,
  page,
  limit,
}: {
  search: string | null;
  page: number;
  limit: number;
}): Promise<{
  data: RefundRequestWithRelations[];
  count: number;
}> {
  try {
    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join
    let query = supabase.from("refund_requests").select(
      `
        *,
        bookings:booking_id (
          id,
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        )
      `,
      { count: "exact" }
    );

    // Add search filter if search term exists (only on text fields)
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `reason.ilike.%${trimmedSearch}%,note.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const refundRequestsData = (data || []) as RefundRequestWithRelations[];

    return {
      data: refundRequestsData,
      count: count || 0,
    };
  } catch (err) {
    console.error("Error searching refund requests:", err);
    throw err;
  }
}

/**
 * Create a new refund request (Server Action)
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
        status: REFUND_REQUEST_STATUS.PENDING,
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

/**
 * Update refund request status (Server Action)
 */
export async function updateRefundRequestStatus(
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

    return data as RefundRequest;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái yêu cầu hoàn tiền";
    throw new Error(errorMessage);
  }
}
