
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";
import type {
  PaymentLogWithBooking,
  PaymentLogsResponse,
} from "@/lib/types";
import { enrichRowsWithBookingRoomItems } from "@/services/enrich-booking-rooms";

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
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();
    const { scope } = await getCurrentUserBranchScope();
    const branchId = resolveBranchFilterId(scope, requestedBranchId);

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const bookingsSelect = branchId
      ? `bookings:booking_id!inner (
          branch_id,
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        )`
      : `bookings:booking_id (
          branch_id,
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        )`;

    let query = supabase
      .from("payment_logs")
      .select(`*, ${bookingsSelect}`, { count: "exact" });

    if (branchId) {
      query = query.eq("bookings.branch_id", branchId);
    }

    // Apply search filter if provided
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `booking_code.ilike.%${trimmedSearch}%,transaction_id.ilike.%${trimmedSearch}%,content.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const paymentLogsData = (data || []) as PaymentLogWithBooking[];
    const enriched = await enrichRowsWithBookingRoomItems(
      supabase,
      paymentLogsData
    );
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: enriched,
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

