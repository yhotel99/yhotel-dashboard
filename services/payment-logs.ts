
import { createClient } from "@/lib/supabase/server";
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
}: {
  search?: string | null;
  page?: number;
  limit?: number;
}): Promise<PaymentLogsResponse> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join
    const query = supabase
      .from("payment_logs")
      .select(
        `
        *,
        bookings:booking_id (
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

    // Apply search filter if provided
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query.or(
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

