
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";
import type {
  PaymentLogWithBooking,
  PaymentLogsResponse,
} from "@/lib/types";

type PaymentLogSearchRow = {
  id: string;
  booking_id: string | null;
  booking_code: string | null;
  transaction_id: string | null;
  amount: number | string | null;
  content: string | null;
  bank_code: string | null;
  status: string | null;
  raw_payload: Record<string, unknown> | null;
  processed_at: string;
  created_at: string;
  reason: string | null;
  bookings: PaymentLogWithBooking["bookings"] | null;
  total_count: number | string;
};

/**
 * Get payment logs list with pagination
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Object with payment logs data and pagination metadata
 */
export async function getPaymentLogsListWithPagination({
  search,
  page = 1,
  limit = 10,
  branchId: requestedBranchId,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
  branchId?: string | null;
}): Promise<PaymentLogsResponse> {
  try {
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();
    const { scope } = await getCurrentUserBranchScope();
    const branchId = resolveBranchFilterId(scope, requestedBranchId);
    const trimmedSearch = search?.trim() || null;

    const { data, error } = await supabase.rpc("search_payment_logs", {
      p_search: trimmedSearch,
      p_page: page,
      p_limit: limit,
      p_branch_id: branchId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const searchRows = (data || []) as PaymentLogSearchRow[];
    const total =
      searchRows.length > 0 ? Number(searchRows[0].total_count || 0) : 0;

    const paymentLogsData: PaymentLogWithBooking[] = searchRows.map((row) => ({
      id: row.id,
      booking_id: row.booking_id,
      booking_code: row.booking_code,
      transaction_id: row.transaction_id,
      amount:
        row.amount == null
          ? null
          : typeof row.amount === "string"
            ? parseFloat(row.amount)
            : row.amount,
      content: row.content,
      bank_code: row.bank_code,
      status: row.status,
      raw_payload: row.raw_payload,
      processed_at: row.processed_at,
      created_at: row.created_at,
      bookings: row.bookings ?? null,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: paymentLogsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách lịch sử thanh toán";
    console.error("Error fetching payment logs list:", err);
    throw new Error(errorMessage);
  }
}
