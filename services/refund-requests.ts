
import { createClient } from "@/lib/supabase/server";
import type {
  RefundRequestWithRelations,
  RefundRequestsResponse,
} from "@/lib/types";

/**
 * Get refund requests list with pagination
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Object with refund requests data and pagination metadata
 */
export async function getRefundRequestsListWithPagination({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
}): Promise<RefundRequestsResponse> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join and user profiles
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
        ),
        request_by_profile:request_by (
          full_name
        ),
        approved_by_profile:approved_by (
          full_name
        ),
        refunded_by_profile:refunded_by (
          full_name
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
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: refundRequestsData,
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
        : "Không thể tải danh sách yêu cầu hoàn tiền";
    console.error("Error fetching refund requests list:", err);
    throw new Error(errorMessage);
  }
}
